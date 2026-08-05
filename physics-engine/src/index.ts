// ============================================================
// Ignis Physics Engine — Public API
//
// This module is the SINGLE entry point the rest of the Ignis platform
// (backend routes, frontend, mission planning) should consume.
//
// Exposed behaviours:
//   simulateRocket(config, options?) → SimulationRun    ← main entry point
//   validateRocket(config)          → ValidationResult  ← pre-flight check
//   validateTrajectory(run)         → ValidationReport  ← post-flight sanity
//   theoreticalDeltaV(config)       → number            ← ideal Δv budget
//   PRESETS                         → built-in vehicles
//
// Exposed types:
//   RocketConfig, StageConfig, ThrustCurvePoint, DragCoefficientPoint,
//   PropulsionType, SimulationOptions, SimulationRun, RocketState,
//   StageEvent, StageEventType, SimulationOutcome, Vector2,
//   ConfigValidationError, ValidationResult, ValidationReport
//
// Internal physics (getStateDerivative, integrateSpan, getDrag, getThrust,
// getGravity, getAtmosphere, the guidance computer, and the validation-suite
// harness) are NOT exported — they are implementation details behind
// simulateRocket. Consuming code should never need to reach inside.
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

// --- Wind model (experimental) ---
// The layered wind model is implemented but not yet integrated into the main
// simulation loop. These exports are @experimental and subject to change.
// Do not depend on them in production code.
export { getWind } from "./wind";
export type { WindState, WindLayer } from "./types";
