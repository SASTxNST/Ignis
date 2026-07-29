import { airDensityAt, gravityAt } from "./atmosphere";
import { G0 } from "./constants";
import { RocketConfig, Stage, Vector2 } from "./types";

export interface FlightForcesInput {
  altitudeM: number;
  velocity: Vector2;
  mass: number;
  stage: Stage | null;
  config: RocketConfig;

  /**
   * Unit vector indicating where the engine is pointing.
   * Computed by the guidance system.
   */
  thrustDirection: Vector2;
}

export interface FlightForcesOutput {
  accelerationMs2: Vector2;
  massFlowRateKgS: number; // positive value, kg of propellant burned per second
  dynamicPressurePa: number;
  thrustKN: number;
}

/**
 * Computes net acceleration at one instant.
 *
 * Gravity-turn model: below the configured pitch-over altitude, thrust points
 * straight up. Once pitch-over starts, thrust (and by extension, the whole
 * "zero-lift" assumption) aligns with the current velocity vector — this is
 * the standard simplified gravity-turn used for planning-grade sims, and it's
 * what lets the rocket "fall" into a horizontal trajectory realistically
 * rather than needing hand-authored steering.
 */
export function computeForces(input: FlightForcesInput): FlightForcesOutput {
  const { altitudeM, velocity, mass, stage, config, thrustDirection  } = input;

  const speed = Math.hypot(velocity.x, velocity.y);
  const g = gravityAt(altitudeM);
  const rho = airDensityAt(altitudeM);

  const dynamicPressurePa = 0.5 * rho * speed * speed;
  const dragMagnitudeN =
    dynamicPressurePa * config.dragCoefficient * config.crossSectionalAreaM2;

  // Drag opposes velocity; guard against divide-by-zero at liftoff (v=0).
  const dragDir: Vector2 =
    speed > 1e-6 ? { x: -velocity.x / speed, y: -velocity.y / speed } : { x: 0, y: 0 };

  let thrustN = 0;
  let massFlowRateKgS = 0;
  
  let thrustDir: Vector2 = input.thrustDirection;

  if (stage) {
    thrustN = stage.thrustKN * 1000;
    massFlowRateKgS = thrustN / (stage.ispSeconds * G0);
  }

  const forceX = thrustN * thrustDir.x + dragMagnitudeN * dragDir.x;
  const forceY = thrustN * thrustDir.y + dragMagnitudeN * dragDir.y - mass * g;

  return {
    accelerationMs2: { x: forceX / mass, y: forceY / mass },
    massFlowRateKgS,
    dynamicPressurePa,
    thrustKN: thrustN / 1000,
  };
}
