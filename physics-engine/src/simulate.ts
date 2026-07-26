import { FIXED_TIMESTEP_S, G0 } from "./constants";
import { computeForces } from "./forces";
import { rk4Step } from "./integrator";
import {
  RocketConfig,
  SimulationOutcome,
  SimulationRun,
  SimulationState,
  Stage,
  StageEvent,
} from "./types";

export interface SimulateOptions {
  /** Hard stop to prevent runaway loops on a bad config. Defaults to 3000s. */
  maxTimeS?: number;
  /** Record telemetry every N physics steps to keep arrays a manageable size. */
  telemetryStride?: number;
}

function stageTotalMass(stage: Stage): number {
  return stage.dryMassKg + stage.propellantMassKg;
}

function totalVehicleMass(config: RocketConfig, fromStageIndex: number, currentStagePropellantKg: number): number {
  let mass = config.payloadMassKg;
  for (let i = fromStageIndex; i < config.stages.length; i++) {
    if (i === fromStageIndex) {
      mass += config.stages[i].dryMassKg + currentStagePropellantKg;
    } else {
      mass += stageTotalMass(config.stages[i]);
    }
  }
  return mass;
}

/** Theoretical vacuum Δv budget via Tsiolkovsky, ignoring gravity/drag losses. Used for validation and UI display. */
export function theoreticalDeltaV(config: RocketConfig): number {
  let deltaV = 0;
  // Mass above the current stage (upper stages + payload) rides along as "payload" for this stage's burn.
  for (let i = 0; i < config.stages.length; i++) {
    const stage = config.stages[i];
    let massAbove = config.payloadMassKg;
    for (let j = i + 1; j < config.stages.length; j++) {
      massAbove += stageTotalMass(config.stages[j]);
    }
    const m0 = stage.dryMassKg + stage.propellantMassKg + massAbove;
    const m1 = stage.dryMassKg + massAbove;
    deltaV += stage.ispSeconds * G0 * Math.log(m0 / m1);
  }
  return deltaV;
}

export function simulate(config: RocketConfig, options: SimulateOptions = {}): SimulationRun {
  const maxTimeS = options.maxTimeS ?? 3000;
  const stride = options.telemetryStride ?? 4;
  const dt = FIXED_TIMESTEP_S;

  let t = 0;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0.001; // tiny upward nudge to give the gravity-turn logic a well-defined velocity direction later

  let activeStageIndex = 0;
  let fuelRemainingKg = config.stages[0]?.propellantMassKg ?? 0;
  let gravityTurnActive = false;
  let gravityTurnKickApplied = false;

  const telemetry: SimulationState[] = [];
  const events: StageEvent[] = [];
  let maxAltitudeM = 0;
  let maxVelocityMs = 0;
  let prevVy = vy;
  let apogeeRecorded = false;

  events.push({ type: "ignition", time: 0, stageIndex: 0, altitude: 0 });

  let step = 0;
  while (t < maxTimeS) {
    const stage: Stage | null = activeStageIndex < config.stages.length ? config.stages[activeStageIndex] : null;
    const mass = totalVehicleMass(config, activeStageIndex, fuelRemainingKg);

    if (!gravityTurnActive && y >= config.gravityTurnStartAltitudeM && !gravityTurnKickApplied) {
      // Small pitch kick to break vertical symmetry, then let the vehicle "fall" into a gravity turn.
      const kickAngleRad = (2 * Math.PI) / 180;
      const speed = Math.hypot(vx, vy) || 1;
      vx += speed * Math.sin(kickAngleRad);
      vy *= Math.cos(kickAngleRad);
      gravityTurnActive = true;
      gravityTurnKickApplied = true;
    }

    const forcesNow = computeForces({
      altitudeM: y,
      velocity: { x: vx, y: vy },
      mass,
      stage: stage && fuelRemainingKg > 0 ? stage : null,
      config,
      gravityTurnActive,
    });

    const derivative = (_t: number, state: number[]) => {
      const [, , svx, svy] = state;
      return [svx, svy, forcesNow.accelerationMs2.x, forcesNow.accelerationMs2.y];
    };

    const [nx, ny, nvx, nvy] = rk4Step(derivative, t, [x, y, vx, vy], dt);
    x = nx;
    y = Math.max(ny, y < 0 ? ny : ny); // allow natural integration; clamp handled by loop-exit check below
    vx = nvx;
    vy = nvy;
    t += dt;
    step++;

    if (stage && fuelRemainingKg > 0) {
      fuelRemainingKg -= forcesNow.massFlowRateKgS * dt;
      if (fuelRemainingKg <= 0) {
        fuelRemainingKg = 0;
        events.push({ type: "burnout", time: t, stageIndex: activeStageIndex, altitude: y });
        if (activeStageIndex + 1 < config.stages.length) {
          events.push({ type: "separation", time: t, stageIndex: activeStageIndex, altitude: y });
          activeStageIndex += 1;
          fuelRemainingKg = config.stages[activeStageIndex].propellantMassKg;
        }
      }
    }

    if (!apogeeRecorded && prevVy > 0 && vy <= 0) {
      events.push({ type: "apogee", time: t, stageIndex: activeStageIndex, altitude: y });
      apogeeRecorded = true;
    }
    prevVy = vy;

    maxAltitudeM = Math.max(maxAltitudeM, y);
    maxVelocityMs = Math.max(maxVelocityMs, Math.hypot(vx, vy));

    if (step % stride === 0) {
      telemetry.push({
        time: t,
        position: { x, y },
        velocity: { x: vx, y: vy },
        mass,
        activeStageIndex,
        fuelRemainingKg,
        thrustKN: forcesNow.thrustKN,
        dynamicPressurePa: forcesNow.dynamicPressurePa,
      });
    }

    // Flight ends when the vehicle comes back down through the pad, but only
    // after it has actually left the ground (avoids a false exit at t=0).
    if (t > dt * 2 && y <= 0) {
      events.push({ type: "impact", time: t, stageIndex: activeStageIndex, altitude: 0 });
      break;
    }
  }

  const outcome: SimulationOutcome =
    maxAltitudeM > 100_000 && maxVelocityMs > 7000 ? "orbit" : maxAltitudeM > 1000 ? "suborbital" : "failure";

  return {
    config,
    telemetry,
    events,
    outcome,
    maxAltitudeM,
    maxVelocityMs,
    totalDeltaVMs: theoreticalDeltaV(config),
  };
}
