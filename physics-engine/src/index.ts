// ============================================================
// Ignis Physics Engine — Public API (Phase 11)
//
// This module is consumed by the rest of the Ignis platform (backend routes,
// frontend, mission planning). It intentionally exposes ONLY:
//
//   Behaviours:
//     simulateRocket(config, options?) -> SimulationRun   <- main entry point
//     validateRocket(config)          -> ValidationResult  <- pre-flight check
//     validateTrajectory(run)         -> ValidationReport  <- shape sanity
//     theoreticalDeltaV(config)       -> number            <- ideal delta-V
//     PRESETS                          -> built-in vehicles
//
//   Types:
//     RocketConfig, StageConfig, ThrustCurvePoint, DragCoefficientPoint,
//     PropulsionType, SimulationOptions, SimulationRun, RocketState,
//     StageEvent, StageEventType, SimulationOutcome, Vector2,
//     ConfigValidationError, ValidationResult, ValidationReport
//
// Internal physics (getStateDerivative, integrateSpan, getDrag, getThrust,
// getGravity, getAtmosphere, the guidance computer, and the validation-suite
// harness) are deliberately NOT exported — they are implementation details.
// The ODE forces and solver live behind simulateRocket.
// ============================================================

// --- Public behaviours ---
export {
  simulateRocket,
  validateRocket,
  validateTrajectory,
  RocketConfigError,
} from "./api";
export type { ConfigValidationError, ValidationResult, ValidationReport } from "./api";

// Teammate-facing helpers that operate purely on public types.
export { theoreticalDeltaV } from "./deltaV";
export { PRESETS } from "./presets";

// --- Public type vocabulary ---
export type {
  Vector2,
  RocketConfig,
  StageConfig,
  ThrustCurvePoint,
  DragCoefficientPoint,
  PropulsionType,
  SimulationOptions,
  SimulationRun,
  RocketState,
  StageEvent,
  StageEventType,
  SimulationOutcome,
} from "./types";
export { DEFAULT_SIMULATION_OPTIONS } from "./types";

// --- Event / metric enum-like values used by consumers ---

/**
 * @deprecated Use simulateRocket(). `simulate` is the Phase 7 internal entry
 * point kept as a transitional alias so existing backend code keeps compiling;
 * new code should call simulateRocket() (which validates the config first).
 */
export { simulate } from "./integrator";


export { getWind } from "./wind";

export type {
  WindState,
  WindLayer,
} from "./types";
