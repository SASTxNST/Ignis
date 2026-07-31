// ============================================================
// Phase 7 — Numerical Integrator
// Adaptive RK45 (Dormand-Prince) via mathjs solveODE, wired to the
// Phase 6 equations of motion (getStateDerivative / getForces).
// ============================================================

import { solveODE } from "mathjs";
import "./mathjsTypes";
import { getStateDerivative, getForces, DerivativeOptions } from "./forces";
import { theoreticalDeltaV } from "./deltaV";
import {
  DEFAULT_SIMULATION_OPTIONS,
  ForceOutput,
  RocketConfig,
  RocketState,
  SimulationOptions,
  SimulationOutcome,
  SimulationRun,
  StageEvent,
  StateVector,
} from "./types";

// -----------------------------------------------------------
// Solver knobs
// -----------------------------------------------------------

export interface IntegratorOptions {
  /** Adaptive method: RK45 (Dormand-Prince, default) or RK23 */
  method?: "RK23" | "RK45";
  /**
   * Solver tolerance.
   *
   * mathjs `solveODE` exposes a SINGLE scalar `tol` with ABSOLUTE error
   * control (per-component |embedded-solution difference| must stay below
   * tol) — it has no separate rtol/atol knobs. The Phase 1 decision
   * (rtol = 1e-9, atol = 1e-9) therefore maps to tol = 1e-9, the tighter
   * of the two, applied to every state component. Do not pass rtol/atol
   * to solveODE — they do not exist in its API.
   */
  solverTolerance?: number;
  /** Initial step size (s). Default 0.05. */
  firstStepS?: number;
  /** Maximum allowed step size (s). Default 2. */
  maxStepS?: number;
  /** Maximum solver iterations before giving up. Default 100_000. */
  maxIter?: number;
}

/** One segment of integrated ODE output: time nodes, states, forces. */
export interface IntegratedSegment {
  /** Time nodes (s) — stage-relative during a burn, absolute during coast */
  t: number[];
  /** State rows: [x, y, vx, vy, mass] at each t[i] */
  y: StateVector[];
  /** Force breakdown at each t[i] (consistent with the forces applied in the ODE) */
  forces: ForceOutput[];
}

// -----------------------------------------------------------
// Core single-span integrator
// -----------------------------------------------------------

/**
 * Integrates the Phase 6 equations of motion over a single time span using
 * mathjs adaptive RK45 (Dormand-Prince). Returns the full time-series with
 * per-step force breakdown.
 *
 * The ODE function is `getStateDerivative`, wrapped to close over the config
 * and derivative options (force toggles, active stage, thrust direction,
 * gravity override). `time` is interpreted by the force model as seconds
 * since ignition of the active stage.
 */
export function integrateSpan(
  config: RocketConfig,
  tspan: [number, number],
  y0: StateVector,
  derivativeOptions: DerivativeOptions,
  integratorOptions: IntegratorOptions = {},
): IntegratedSegment {
  const tolerance =
    integratorOptions.solverTolerance ??
    DEFAULT_SIMULATION_OPTIONS.solverAbsoluteTolerance;

  const func = (t: number, y: number[]): number[] =>
    getStateDerivative(t, y as StateVector, config, derivativeOptions);

  const sol = solveODE(func, tspan, [...y0], {
    method: integratorOptions.method ?? "RK45",
    tol: tolerance,
    firstStep: integratorOptions.firstStepS ?? 0.05,
    maxStep: integratorOptions.maxStepS ?? 2,
    maxIter: integratorOptions.maxIter ?? 100_000,
  });

  const t = sol.t;
  const y = sol.y as StateVector[];
  const forces: ForceOutput[] = y.map((state, i) =>
    getForces(t[i], state, config, derivativeOptions),
  );

  return { t, y, forces };
}

// -----------------------------------------------------------
// Telemetry building
// -----------------------------------------------------------

function initialVehicleMass(config: RocketConfig): number {
  return (
    config.payloadMassKg +
    config.stages.reduce((sum, s) => sum + s.dryMassKg + s.propellantMassKg, 0)
  );
}

/** Dry mass of the active stage plus everything above it (dead weight). */
function massBelowDryAndAbove(config: RocketConfig, activeStageIndex: number): number {
  const stage = config.stages[activeStageIndex];
  if (!stage) return 0;
  return (
    stage.dryMassKg +
    config.payloadMassKg +
    config.stages
      .slice(activeStageIndex + 1)
      .reduce((sum, s) => sum + s.dryMassKg + s.propellantMassKg, 0)
  );
}

function buildTelemetry(
  config: RocketConfig,
  missionTime: number,
  state: StateVector,
  forces: ForceOutput,
  activeStageIndex: number,
): RocketState {
  const [x, y, vx, vy, mass] = state;

  let propellantRemaining = 0;
  if (activeStageIndex >= 0) {
    propellantRemaining = Math.max(
      0,
      mass - massBelowDryAndAbove(config, activeStageIndex),
    );
  }

  return {
    time: missionTime,
    position: { x, y },
    velocity: { x: vx, y: vy },
    mass,
    activeStageIndex,
    propellantMassRemaining: propellantRemaining,
    thrustMagnitude: Math.hypot(forces.forces.thrust.x, forces.forces.thrust.y),
    dynamicPressure: forces.dynamicPressure,
    machNumber: forces.machNumber,
    forces: forces.forces,
    acceleration: forces.acceleration,
  };
}

// -----------------------------------------------------------
// Full-flight simulation: staged burns, coast, apogee, descent, impact
// -----------------------------------------------------------

const COAST_CHUNK_S = 10;

/**
 * Runs the full trajectory for a rocket config: powered ascent through all
 * stages (jettisoning each spent stage's dry mass), unpowered coast, apogee,
 * descent, and ground impact. Produces a complete SimulationRun with a
 * full time-series (trajectory, velocity, mass, forces at each step).
 *
 * NOTE: Stage boundaries are handled by segmented integration (each stage is
 * integrated over its exact burn window; the spent stage is jettisoned
 * between segments). Apogee and impact are located by scanning the coast
 * trajectory and refining each crossing with a short, densely-stepped
 * re-integration — this is Phase 9's event detection in its minimal form.
 */
export function simulate(
  config: RocketConfig,
  simOptions: Partial<SimulationOptions> = {},
): SimulationRun {
  const options: SimulationOptions = { ...DEFAULT_SIMULATION_OPTIONS, ...simOptions };

  const intOpts: IntegratorOptions = {
    method: "RK45",
    solverTolerance: options.solverRelativeTolerance,
  };

  const telemetry: RocketState[] = [];
  const events: StageEvent[] = [];
  let missionTime = 0;
  let state: StateVector = [0, 0, 0, 0, initialVehicleMass(config)];

  // --- Powered ascent: stages in burn order ---
  for (let i = 0; i < config.stages.length; i++) {
    const stage = config.stages[i];

    events.push({
      type: "ignition",
      time: missionTime,
      stageIndex: i,
      altitude: state[1],
    });

    const segment = integrateSpan(
      config,
      [0, stage.burnTime],
      state,
      { activeStageIndex: i },
      intOpts,
    );

    for (let k = 0; k < segment.t.length; k++) {
      if (k % options.telemetryRecordStride !== 0 && k !== segment.t.length - 1) continue;
      telemetry.push(
        buildTelemetry(config, missionTime + segment.t[k], segment.y[k], segment.forces[k], i),
      );
    }

    state = segment.y[segment.y.length - 1];
    missionTime += stage.burnTime;

    events.push({
      type: "burnout",
      time: missionTime,
      stageIndex: i,
      altitude: state[1],
    });

    if (i < config.stages.length - 1) {
      // Jettison the spent stage's dry mass before the next ignition.
      state[4] -= stage.dryMassKg;
      events.push({
        type: "separation",
        time: missionTime,
        stageIndex: i,
        altitude: state[1],
      });
    }
  }

  // --- Coast: apogee, descent, impact ---
  const coast = integrateCoast(config, options, state, missionTime, intOpts, telemetry, events);

  let outcome: SimulationOutcome = "suborbital";
  let impactTime = coast.impactTime;
  if (!Number.isFinite(impactTime)) {
    impactTime = options.maxTimeS;
    outcome = "orbit";
  }

  // --- Metrics (computed from the full-resolution sample set) ---
  let maxAltitude = -Infinity;
  let maxAltitudeTime = 0;
  let maxVelocity = -Infinity;
  let maxQ = -Infinity;
  let maxMach = -Infinity;
  let maxQTime = 0;
  let transonicTime: number | undefined;

  for (let i = 0; i < telemetry.length; i++) {
    const s = telemetry[i];
    const speed = Math.hypot(s.velocity.x, s.velocity.y);
    if (s.position.y > maxAltitude) {
      maxAltitude = s.position.y;
      maxAltitudeTime = s.time;
    }
    if (speed > maxVelocity) maxVelocity = speed;
    if (s.dynamicPressure > maxQ) {
      maxQ = s.dynamicPressure;
      maxQTime = s.time;
    }
    if (s.machNumber > maxMach) maxMach = s.machNumber;
    if (
      i > 0 &&
      transonicTime === undefined &&
      telemetry[i - 1].machNumber < 1 &&
      s.machNumber >= 1
    ) {
      transonicTime = s.time;
    }
  }

  if (transonicTime !== undefined) {
    events.push({
      type: "transonic",
      time: transonicTime,
      stageIndex: -1,
      altitude: altitudeAtTime(telemetry, transonicTime),
    });
  }

  if (maxQTime > 0) {
    events.push({
      type: "maxq",
      time: maxQTime,
      stageIndex: -1,
      altitude: altitudeAtTime(telemetry, maxQTime),
    });
  }

  // Apogee: refined from the coast crossing when one exists; otherwise
  // fall back to the sampled maximum (only possible for non-returning flights).
  const apogee =
    coast.apogee ?? { altitude: maxAltitude, time: maxAltitudeTime };
  if (coast.apogee) {
    events.push({
      type: "apogee",
      time: apogee.time,
      stageIndex: -1,
      altitude: apogee.altitude,
    });
  }
  events.push({
    type: "impact",
    time: impactTime,
    stageIndex: -1,
    altitude: 0,
  });

  return {
    config,
    telemetry,
    events,
    outcome,
    maxAltitudeM: maxAltitude,
    maxVelocityMs: maxVelocity,
    maxMach: maxMach,
    maxQ: maxQ,
    totalDeltaVMs: theoreticalDeltaV(config),
    apogeeAltitudeM: apogee.altitude,
    apogeeTime: apogee.time,
    impactTime,
    impactVelocityMs: coast.impactVelocityMs,
  };
}

interface CoastResult {
  impactTime: number;
  impactVelocityMs: number;
  apogee: { altitude: number; time: number } | null;
}

function integrateCoast(
  config: RocketConfig,
  options: SimulationOptions,
  startState: StateVector,
  startMissionTime: number,
  intOpts: IntegratorOptions,
  telemetry: RocketState[],
  events: StageEvent[],
): CoastResult {
  let state = startState;
  let tMission = startMissionTime;
  const derOpts: DerivativeOptions = { activeStageIndex: -1 };

  let apogee: { altitude: number; time: number } | null = null;
  let impactTime = NaN;
  let impactVelocityMs = 0;
  let prevLastY: StateVector | null = null;
  let prevLastT = NaN;

  while (tMission < options.maxTimeS) {
    const dt = Math.min(COAST_CHUNK_S, options.maxTimeS - tMission);
    const segment = integrateSpan(config, [tMission, tMission + dt], state, derOpts, intOpts);

    for (let k = 0; k < segment.t.length; k++) {
      telemetry.push(buildTelemetry(config, segment.t[k], segment.y[k], segment.forces[k], -1));
    }

    const last = segment.y[segment.y.length - 1];

    // --- Apogee detection: vy crosses from >0 to <=0 ---
    if (!apogee) {
      for (let i = 0; i < segment.y.length; i++) {
        const before = i === 0 ? prevLastY : segment.y[i - 1];
        if (!before) continue;
        if (before[3] > 0 && segment.y[i][3] <= 0) {
          const beforeT = i === 0 ? prevLastT : segment.t[i - 1];
          const afterT = segment.t[i];
          apogee = refineApogee(config, derOpts, intOpts, before, beforeT, segment.y[i], afterT);
          break;
        }
      }
    }

    // --- Impact detection: y crosses from >0 to <=0 ---
    const impactIdx = findImpactCrossing(segment, prevLastY);
    if (impactIdx >= 0) {
      const before = impactIdx === 0 ? prevLastY! : segment.y[impactIdx - 1];
      const beforeT = impactIdx === 0 ? prevLastT : segment.t[impactIdx - 1];
      const after = segment.y[impactIdx];
      const afterT = segment.t[impactIdx];
      const refined = refineImpact(config, derOpts, intOpts, before, beforeT, after, afterT);
      impactTime = refined.time;
      impactVelocityMs = refined.impactVelocityMs;
      break;
    }

    prevLastY = segment.y[segment.y.length - 1];
    prevLastT = segment.t[segment.t.length - 1];
    state = last;
    tMission += dt;
  }

  return { impactTime, impactVelocityMs, apogee };
}

/**
 * Densely re-integrates the small window bracketing an apogee crossing to
 * locate the peak altitude to far better than the coarse trajectory step.
 */
function refineApogee(
  config: RocketConfig,
  derivativeOptions: DerivativeOptions,
  integratorOptions: IntegratorOptions,
  before: StateVector,
  beforeT: number,
  after: StateVector,
  afterT: number,
): { altitude: number; time: number } {
  const dense = integrateSpan(config, [beforeT, afterT], before, derivativeOptions, {
    ...integratorOptions,
    maxStepS: 0.01,
  });

  let maxAlt = -Infinity;
  let maxTime = beforeT;
  for (let i = 0; i < dense.y.length; i++) {
    if (dense.y[i][1] > maxAlt) {
      maxAlt = dense.y[i][1];
      maxTime = dense.t[i];
    }
  }
  return { altitude: maxAlt, time: maxTime };
}

/**
 * Densely re-integrates the window bracketing a ground impact and locates
 * the exact y = 0 crossing (linear interpolation of the two straddling
 * samples of the refined trajectory).
 */
function refineImpact(
  config: RocketConfig,
  derivativeOptions: DerivativeOptions,
  integratorOptions: IntegratorOptions,
  before: StateVector,
  beforeT: number,
  after: StateVector,
  afterT: number,
): { time: number; impactVelocityMs: number } {
  const dense = integrateSpan(config, [beforeT, afterT], before, derivativeOptions, {
    ...integratorOptions,
    maxStepS: 0.01,
  });

  for (let i = 1; i < dense.y.length; i++) {
    if (dense.y[i][1] <= 0) {
      const y0 = dense.y[i - 1][1];
      const y1 = dense.y[i][1];
      const t0 = dense.t[i - 1];
      const t1 = dense.t[i];
      const frac = y0 / (y0 - y1); // fraction of the step where y crosses 0
      const time = t0 + frac * (t1 - t0);
      const vx = dense.y[i - 1][2] + frac * (dense.y[i][2] - dense.y[i - 1][2]);
      const vy = dense.y[i - 1][3] + frac * (dense.y[i][3] - dense.y[i - 1][3]);
      return { time, impactVelocityMs: Math.hypot(vx, vy) };
    }
  }
  return { time: afterT, impactVelocityMs: Math.hypot(after[2], after[3]) };
}

function findImpactCrossing(
  segment: IntegratedSegment,
  prevLastY: StateVector | null,
): number {
  for (let i = 1; i < segment.y.length; i++) {
    if (segment.y[i - 1][1] > 0 && segment.y[i][1] <= 0) return i;
  }
  if (prevLastY && prevLastY[1] > 0 && segment.y[0][1] <= 0) return 0;
  return -1;
}

function altitudeAtTime(telemetry: RocketState[], time: number): number {
  for (let i = 1; i < telemetry.length; i++) {
    if (telemetry[i].time >= time) {
      const a = telemetry[i - 1];
      const b = telemetry[i];
      const frac = b.time - a.time > 0 ? (time - a.time) / (b.time - a.time) : 0;
      return a.position.y + frac * (b.position.y - a.position.y);
    }
  }
  return telemetry.length > 0 ? telemetry[telemetry.length - 1].position.y : 0;
}
