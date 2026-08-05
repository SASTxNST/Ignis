/**
 * Backend validation layer.
 *
 * Rather than maintaining a parallel (and inevitably diverging) validation
 * implementation, this module delegates directly to the physics engine's
 * canonical `validateRocket` function, which:
 *   - accepts `unknown` as input (safe for raw HTTP bodies)
 *   - checks every field the engine actually needs
 *   - returns field-level errors in a structured format
 *
 * The backend's old hand-rolled validator was checking fields that no longer
 * exist on the current StageConfig (`thrustKN`, `ispSeconds`, `dragCoefficient`,
 * `crossSectionalAreaM2`) and missing fields that do exist (`thrustCurve`,
 * `ispVacuum`, `ispSeaLevel`, `referenceAreaM2`).
 */

import { validateRocket, ConfigValidationError } from "@ignis/physics-engine";

export type { ConfigValidationError };

/**
 * Validates a raw rocket configuration object from an HTTP request body.
 * Returns an empty array when the config is valid, or a non-empty array of
 * field-level errors when it is not.
 */
export function validateRocketConfig(config: unknown): ConfigValidationError[] {
  const result = validateRocket(config);
  return result.errors;
}
