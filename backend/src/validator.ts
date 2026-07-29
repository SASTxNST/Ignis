import { RocketConfig, Stage } from "@ignis/physics-engine";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRocketConfig(config: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== "object") {
    return [{ field: "root", message: "Configuration must be an object." }];
  }

  if (!config.id || typeof config.id !== "string") {
    errors.push({ field: "id", message: "Rocket configuration must have a valid string 'id'." });
  }

  if (!config.name || typeof config.name !== "string") {
    errors.push({ field: "name", message: "Rocket configuration must have a valid string 'name'." });
  }

  if (typeof config.payloadMassKg !== "number" || config.payloadMassKg < 0) {
    errors.push({ field: "payloadMassKg", message: "'payloadMassKg' must be a non-negative number." });
  }

  if (typeof config.gravityTurnStartAltitudeM !== "number" || config.gravityTurnStartAltitudeM < 0) {
    errors.push({ field: "gravityTurnStartAltitudeM", message: "'gravityTurnStartAltitudeM' must be a non-negative number." });
  }

  if (typeof config.dragCoefficient !== "number" || config.dragCoefficient < 0) {
    errors.push({ field: "dragCoefficient", message: "'dragCoefficient' must be a non-negative number." });
  }

  if (typeof config.crossSectionalAreaM2 !== "number" || config.crossSectionalAreaM2 <= 0) {
    errors.push({ field: "crossSectionalAreaM2", message: "'crossSectionalAreaM2' must be a positive number." });
  }

  if (!Array.isArray(config.stages) || config.stages.length === 0) {
    errors.push({ field: "stages", message: "'stages' must be a non-empty array." });
  } else {
    config.stages.forEach((stage: any, index: number) => {
      const stageErrors = validateStage(stage, index);
      errors.push(...stageErrors);
    });
  }

  return errors;
}

function validateStage(stage: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `stages[${index}]`;

  if (!stage || typeof stage !== "object") {
    return [{ field: prefix, message: `Stage at index ${index} must be an object.` }];
  }

  if (!stage.name || typeof stage.name !== "string") {
    errors.push({ field: `${prefix}.name`, message: "Stage must have a valid string name." });
  }

  const validPropulsionTypes = ["solid", "liquid", "cryogenic"];
  if (!stage.propulsionType || !validPropulsionTypes.includes(stage.propulsionType)) {
    errors.push({ field: `${prefix}.propulsionType`, message: `Propulsion type must be one of: ${validPropulsionTypes.join(", ")}` });
  }

  if (typeof stage.thrustKN !== "number" || stage.thrustKN <= 0) {
    errors.push({ field: `${prefix}.thrustKN`, message: "Thrust (kN) must be a positive number." });
  }

  if (typeof stage.ispSeconds !== "number" || stage.ispSeconds <= 0) {
    errors.push({ field: `${prefix}.ispSeconds`, message: "Specific impulse (Isp seconds) must be a positive number." });
  }

  if (typeof stage.dryMassKg !== "number" || stage.dryMassKg <= 0) {
    errors.push({ field: `${prefix}.dryMassKg`, message: "Dry mass (kg) must be a positive number." });
  }

  if (typeof stage.propellantMassKg !== "number" || stage.propellantMassKg <= 0) {
    errors.push({ field: `${prefix}.propellantMassKg`, message: "Propellant mass (kg) must be a positive number." });
  }

  return errors;
}
