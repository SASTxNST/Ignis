// ============================================================
// Phase 11 — Clean Public Module API
//
// This file is the SINGLE entry point the rest of the Ignis platform
// (backend routes, frontend, mission planning) should consume. It exposes
// exactly two behaviours:
//
//   simulateRocket(config, options?) -> SimulationRun
//   validateRocket(config)          -> ValidationResult
//
// Internal physics modules (equations of motion, ODE integrator, drag /
// atmosphere / propulsion internals, guidance) are NOT re-exported from
// index.ts — the team integrates against this facade without needing to
// understand how the numbers are produced.
// ============================================================

import { simulate } from "./integrator";
import { validateTrajectory, ValidationReport } from "./trajectoryValidator";
import { RocketConfig, SimulationOptions, SimulationRun } from "./types";

// -----------------------------------------------------------
// Public result type for config validation
// -----------------------------------------------------------

/** One specific problem found in a rocket config. */
export interface ConfigValidationError {
  /** Dotted path to the offending field, e.g. "stages[0].burnTime". */
  field: string;
  /** Human-readable explanation of what is wrong and what was expected. */
  message: string;
}

/** Result of validateRocket(): a valid flag plus all problems found. */
export interface ValidationResult {
  /** True only when no errors were found and the config is safe to simulate. */
  valid: boolean;
  /** Every problem detected, in config order. Empty when valid is true. */
  errors: ConfigValidationError[];
}

// -----------------------------------------------------------
// Propulsion types accepted by a stage
// -----------------------------------------------------------

const VALID_PROPULSION_TYPES = new Set(["solid", "liquid", "cryogenic"]);

// -----------------------------------------------------------
// validateRocket — pre-flight config sanity checks
// -----------------------------------------------------------

/**
 * Checks that a rocket configuration is well-formed BEFORE simulation, so a
 * malformed config fails fast with a clear, field-level error message instead
 * of producing a silent physics bug or a hard-to-trace integrator error.
 *
 * The input is typed as `unknown` on purpose: this function is the trust
 * boundary for configs coming from JSON / the sandbox editor / an HTTP body,
 * which may not satisfy the TypeScript types at runtime.
 *
 * Checks performed (each produces a ConfigValidationError on failure):
 *  - top-level identity and shape (id, name)
 *  - payload mass is a finite non-negative number
 *  - launch / guidance scalars are finite numbers in sane ranges
 *  - aerodynamic reference area is a positive finite number
 *  - drag coefficient curve is a non-empty, ordered, finite table
 *  - at least one stage, and per-stage:
 *      name / valid propulsion type
 *      dry mass > 0, propellant mass >= 0 and finite
 *      burn time > 0 and finite
 *      ispSeaLevel / ispVacuum > 0 and finite
 *      thrustCurve is a non-empty, time-ordered, finite table within [0, burnTime]
 */
export function validateRocket(config: unknown): ValidationResult {
  const errors: ConfigValidationError[] = [];
  const err = (field: string, message: string): void => {
    errors.push({ field, message });
  };

  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return {
      valid: false,
      errors: [{ field: "root", message: "Config must be a non-null object." }],
    };
  }

  const c = config as Record<string, unknown>;

  // --- Identity ---
  if (typeof c.id !== "string" || c.id.trim() === "") {
    err("id", "'id' must be a non-empty string.");
  }
  if (typeof c.name !== "string" || c.name.trim() === "") {
    err("name", "'name' must be a non-empty string.");
  }

  // --- Mass ---
  if (!isFiniteNumber(c.payloadMassKg) || (c.payloadMassKg as number) < 0) {
    err("payloadMassKg", "'payloadMassKg' must be a finite number >= 0.");
  }

  // --- Launch & guidance scalars ---
  if (!isFiniteNumber(c.launchAngleDeg)) {
    err("launchAngleDeg", "'launchAngleDeg' must be a finite number (0 = vertical).");
  } else if ((c.launchAngleDeg as number) < 0 || (c.launchAngleDeg as number) > 90) {
    err("launchAngleDeg", "'launchAngleDeg' must be between 0 (vertical) and 90 (horizontal).");
  }
  if (!isFiniteNumber(c.gravityTurnStartAltitudeM) || (c.gravityTurnStartAltitudeM as number) < 0) {
    err("gravityTurnStartAltitudeM", "'gravityTurnStartAltitudeM' must be a finite number >= 0.");
  }
  if (!isFiniteNumber(c.gravityTurnRateDegS) || (c.gravityTurnRateDegS as number) < 0) {
    err("gravityTurnRateDegS", "'gravityTurnRateDegS' must be a finite number >= 0.");
  }

  // --- Aerodynamics ---
  if (!isFiniteNumber(c.referenceAreaM2) || (c.referenceAreaM2 as number) <= 0) {
    err("referenceAreaM2", "'referenceAreaM2' must be a finite number > 0 (m^2).");
  }
  validateCurve(c.dragCoefficientCurve, "dragCoefficientCurve", "mach", "cd", errors);

  // --- Stages ---
  if (!Array.isArray(c.stages) || c.stages.length === 0) {
    err("stages", "'stages' must be a non-empty array (at least one stage).");
  } else {
    (c.stages as unknown[]).forEach((stage, i) => validateStage(stage, i, errors));
  }

  return { valid: errors.length === 0, errors };
}

function validateStage(
  stage: unknown,
  index: number,
  errors: ConfigValidationError[],
): void {
  const err = (field: string, message: string): void => {
    errors.push({ field, message });
  };
  const prefix = `stages[${index}]`;

  if (stage === null || typeof stage !== "object" || Array.isArray(stage)) {
    err(prefix, `Stage at index ${index} must be an object.`);
    return;
  }
  const s = stage as Record<string, unknown>;

  if (typeof s.name !== "string" || s.name.trim() === "") {
    err(`${prefix}.name`, "Stage 'name' must be a non-empty string.");
  }
  if (typeof s.propulsionType !== "string" || !VALID_PROPULSION_TYPES.has(s.propulsionType)) {
    err(
      `${prefix}.propulsionType`,
      `'propulsionType' must be one of: ${[...VALID_PROPULSION_TYPES].join(", ")}.`,
    );
  }

  if (!isFiniteNumber(s.dryMassKg) || (s.dryMassKg as number) <= 0) {
    err(`${prefix}.dryMassKg`, "'dryMassKg' must be a finite number > 0 (kg).");
  }
  if (!isFiniteNumber(s.propellantMassKg) || (s.propellantMassKg as number) < 0) {
    err(`${prefix}.propellantMassKg`, "'propellantMassKg' must be a finite number >= 0 (kg).");
  }

  const burnTime = s.burnTime;
  if (!isFiniteNumber(burnTime) || (burnTime as number) <= 0) {
    err(`${prefix}.burnTime`, "'burnTime' must be a finite number > 0 (s).");
  }

  if (!isFiniteNumber(s.ispSeaLevel) || (s.ispSeaLevel as number) <= 0) {
    err(`${prefix}.ispSeaLevel`, "'ispSeaLevel' must be a finite number > 0 (s).");
  }
  if (!isFiniteNumber(s.ispVacuum) || (s.ispVacuum as number) <= 0) {
    err(`${prefix}.ispVacuum`, "'ispVacuum' must be a finite number > 0 (s).");
  }

  // Thrust curve: non-empty, time-ordered, finite, within [0, burnTime].
  const curve = s.thrustCurve;
  if (!Array.isArray(curve) || curve.length === 0) {
    err(`${prefix}.thrustCurve`, "'thrustCurve' must be a non-empty array of { time, thrust } points.");
  } else {
    let prevTime = -Infinity;
    let maxTime = -Infinity;

    // Require the curve to start at t=0 so thrust at ignition is well-defined.
    const firstPt = curve[0] as Record<string, unknown>;
    if (firstPt && isFiniteNumber(firstPt.time) && (firstPt.time as number) > 1e-6) {
      err(`${prefix}.thrustCurve`, "Thrust curve must start at time 0 (include a point at t=0).");
    }

    for (let k = 0; k < curve.length; k++) {
      const pt = curve[k] as Record<string, unknown>;
      const fieldBase = `${prefix}.thrustCurve[${k}]`;
      if (pt === null || typeof pt !== "object") {
        err(fieldBase, "Thrust-curve point must be an object { time, thrust }.");
        continue;
      }
      if (!isFiniteNumber(pt.time) || (pt.time as number) < 0) {
        err(`${fieldBase}.time`, "'time' must be a finite number >= 0 (s since ignition).");
      } else {
        const t = pt.time as number;
        if (t < prevTime) {
          err(`${fieldBase}.time`, "Thrust-curve times must be non-decreasing.");
        }
        if (isFiniteNumber(burnTime) && t > (burnTime as number) + 1e-6) {
          err(`${fieldBase}.time`, `'time' must be <= burnTime (${burnTime}s).`);
        }
        prevTime = t;
        maxTime = Math.max(maxTime, t);
      }
      if (!isFiniteNumber(pt.thrust) || (pt.thrust as number) < 0) {
        err(`${fieldBase}.thrust`, "'thrust' must be a finite number >= 0 (N).");
      }
    }
    // A thrust curve that doesn't reach burnTime leaves the stage unpowered
    // for the tail of its declared burn — almost always a data-entry bug.
    if (
      isFiniteNumber(burnTime) &&
      (burnTime as number) > 0 &&
      maxTime > -Infinity &&
      maxTime < (burnTime as number) - 1e-6
    ) {
      err(
        `${prefix}.thrustCurve`,
        `Thrust curve ends at ${maxTime}s but 'burnTime' is ${burnTime}s; the curve must span the full burn.`,
      );
    }
  }
}

function validateCurve(
  curve: unknown,
  field: string,
  xKey: string,
  yKey: string,
  errors: ConfigValidationError[],
): void {
  const err = (f: string, m: string): void => {
    errors.push({ field: f, message: m });
  };
  if (!Array.isArray(curve) || curve.length === 0) {
    err(field, `'${field}' must be a non-empty array of { ${xKey}, ${yKey} } points.`);
    return;
  }
  let prevX = -Infinity;
  for (let k = 0; k < curve.length; k++) {
    const pt = curve[k] as Record<string, unknown>;
    const fieldBase = `${field}[${k}]`;
    if (pt === null || typeof pt !== "object") {
      err(fieldBase, "Curve point must be an object.");
      continue;
    }
    const x = pt[xKey];
    const y = pt[yKey];
    if (!isFiniteNumber(x)) {
      err(`${fieldBase}.${xKey}`, `'${xKey}' must be a finite number.`);
    } else {
      if ((x as number) < prevX) {
        err(`${fieldBase}.${xKey}`, `'${field}' ${xKey} values must be non-decreasing.`);
      }
      prevX = x as number;
    }
    if (!isFiniteNumber(y)) {
      err(`${fieldBase}.${yKey}`, `'${yKey}' must be a finite number.`);
    }
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// -----------------------------------------------------------
// simulateRocket — the single simulation entry point
// -----------------------------------------------------------

/** Error thrown when simulateRocket() is given an invalid config. */
export class RocketConfigError extends Error {
  public readonly errors: ConfigValidationError[];
  constructor(errors: ConfigValidationError[]) {
    super(
      "Invalid rocket configuration:\n" +
        errors.map((e) => `  - ${e.field}: ${e.message}`).join("\n"),
    );
    this.name = "RocketConfigError";
    this.errors = errors;
  }
}

/**
 * Runs a full flight simulation for a rocket configuration and returns the
 * complete simulation run: time-series telemetry (position, velocity, mass,
 * forces at each accepted adaptive step), discrete events (ignition, burnout,
 * separation, max-Q, transonic, apogee, impact), headline metrics, and the
 * overall outcome ("orbit" | "suborbital" | "failure").
 *
 * The config is validated first — an invalid config throws RocketConfigError
 * with the exact fields that are wrong, so callers see a clear message rather
 * than a silent integrator failure.
 *
 * This is the ONLY simulation function the rest of Ignis should call.
 *
 * @param config  The rocket to fly (see RocketConfig).
 * @param options Optional solver/output overrides (see SimulationOptions).
 *                All fields are optional; defaults are tuned and validated.
 * @returns       The full SimulationRun.
 *
 * @example
 *   import { simulateRocket, PRESETS } from "@ignis/physics-engine";
 *   const run = simulateRocket(PRESETS["vikram-1"]);
 *   console.log(run.maxAltitudeM, run.apogeeAltitudeM, run.outcome);
 */
export function simulateRocket(
  config: RocketConfig,
  options?: Partial<SimulationOptions>,
): SimulationRun {
  const validation = validateRocket(config);
  if (!validation.valid) {
    throw new RocketConfigError(validation.errors);
  }
  return simulate(config, options);
}

/**
 * Re-export of the Phase 9 trajectory plausibility validator, so consumers
 * can sanity-check any SimulationRun shape without importing internal modules.
 */
export { validateTrajectory };
export type { ValidationReport };
