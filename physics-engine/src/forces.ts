// ============================================================
// Phase 6 — Combine Forces into Equations of Motion
// 3DOF planar point-mass. State vector [x, y, vx, vy, mass].
// Derivative vector [vx, vy, ax, ay, dmdt].
// ============================================================

import { DerivativeVector, ForceOutput, RocketConfig, StateVector, Vector2 } from "./types";
import { getThrust, getMassFlowRate } from "./propulsion";
import { getGravity } from "./gravity";
import { getDragDetails } from "./drag";
import { guidanceComputer } from "./guidance";

/**
 * Toggles and overrides for a single derivative evaluation.
 * Force toggles default to enabled; they exist so unit tests can isolate
 * one force at a time (per Phase 6 roadmap) and so Phase 8 staging can
 * switch the active stage without threading extra state through the ODE.
 */
export interface DerivativeOptions {
  /** 0-based index of the currently burning stage (default 0) */
  activeStageIndex?: number;
  /** Override thrust direction (unit vector); default = guidanceComputer output */
  thrustDirection?: Vector2;
  /** Set false to disable thrust (default true) */
  enableThrust?: boolean;
  /** Set false to disable gravity (default true) */
  enableGravity?: boolean;
  /**
   * Override gravitational acceleration with a constant value (m/s^2).
   * When set, gravity force = mass * gravityMs2 (downward), replacing the
   * inverse-square getGravity(altitude) model.
   * TEST-ONLY override — used by the Phase 7 analytical validation (vacuum
   * projectile with constant gravity), never in production trajectories.
   */
  gravityMs2?: number;
  /** Set false to disable drag (default true) */
  enableDrag?: boolean;
}

/**
 * Full force computation at an instant: individual force vectors, mass flow
 * rate, dynamic pressure, Mach number, and resulting acceleration.
 *
 * This is the single source of truth for the Phase 6 equations of motion.
 * `getStateDerivative` uses it to feed the ODE solver; the integrator uses it
 * to report per-step force telemetry. Because both read from the same
 * computation, the reported forces are guaranteed consistent with the forces
 * actually applied during integration.
 */
export function getForces(
  time: number,
  state: StateVector,
  config: RocketConfig,
  options: DerivativeOptions = {},
): ForceOutput {
  const [x, y, vx, vy, mass] = state;

  const altitude = Math.max(y, 0);
  const activeStageIndex = options.activeStageIndex ?? 0;
  const stage = config.stages[activeStageIndex];

  const safeMass = mass > 1e-9 ? mass : 1e-9;

  // --- Thrust ---
  const enableThrust = options.enableThrust ?? true;
  let thrust: Vector2 = { x: 0, y: 0 };

  if (enableThrust && stage) {
    const thrustMagnitude = getThrust(time, stage, altitude);
    if (thrustMagnitude > 0) {
      const direction: Vector2 =
        options.thrustDirection ??
        guidanceComputer({
          time,
          position: { x, y },
          altitude,
          velocity: { x: vx, y: vy },
          mass,
          stageIndex: activeStageIndex,
        });
      thrust = { x: direction.x * thrustMagnitude, y: direction.y * thrustMagnitude };
    }
  }

  // --- Gravity ---
  const enableGravity = options.enableGravity ?? true;
  const g = options.gravityMs2 ?? getGravity(altitude);
  const gravity: Vector2 = {
    x: 0,
    y: enableGravity ? -safeMass * g : 0,
  };

  // --- Drag ---
  const enableDrag = options.enableDrag ?? true;
  const dragDetails = enableDrag
    ? getDragDetails({ x: vx, y: vy }, altitude, config)
    : null;
  const drag: Vector2 = dragDetails ? dragDetails.drag : { x: 0, y: 0 };
  const dynamicPressure = dragDetails ? dragDetails.dynamicPressure : 0;
  const machNumber = dragDetails ? dragDetails.machNumber : 0;

  // --- Sum forces ---
  const totalX = thrust.x + gravity.x + drag.x;
  const totalY = thrust.y + gravity.y + drag.y;

  // --- Mass flow rate (positive while propellant is consumed) ---
  const massFlowRate = enableThrust && stage ? getMassFlowRate(time, stage) : 0;

  return {
    forces: {
      thrust,
      gravity,
      drag,
      total: { x: totalX, y: totalY },
    },
    massFlowRate,
    dynamicPressure,
    machNumber,
    acceleration: { x: totalX / safeMass, y: totalY / safeMass },
  };
}

/**
 * Returns the time-derivative of the ODE state at an instant:
 *   d/dt [x, y, vx, vy, mass] = [vx, vy, ax, ay, dmdt]
 *
 * Forces summed as vectors (Newton's second law):
 *   m * a = F_thrust + F_gravity + F_drag
 *
 * Thrust magnitude comes from getThrust (thrust curve + altitude Isp blend),
 * applied along the guidance computer's thrust direction. Gravity uses the
 * inverse-square model. Drag opposes the full velocity vector.
 *
 * NOTE: `time` is interpreted as seconds since ignition of the active stage
 * (stage 0 ignites at t = 0). Phase 8 staging will handle burn-to-burn time.
 */
export function getStateDerivative(
  time: number,
  state: StateVector,
  config: RocketConfig,
  options: DerivativeOptions = {},
): DerivativeVector {
  const [x, y, vx, vy] = state;

  const out = getForces(time, state, config, options);

  return [vx, vy, out.acceleration.x, out.acceleration.y, -out.massFlowRate];
}
