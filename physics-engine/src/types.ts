/**
 * Core data model for Ignis.
 *
 * This shape is intentionally shared across three consumers:
 *  - the physics engine (produces SimulationRun from RocketConfig)
 *  - the backend (persists / serves RocketConfig and SimulationRun)
 *  - the frontend (renders SimulationRun as trajectory + telemetry, and
 *    lets sandbox mode edit RocketConfig)
 *
 * Keeping one shape for all three is what makes sandbox mode, mission
 * replay, and future multiplayer comparisons cheap to add later.
 */

export type PropulsionType = "solid" | "liquid" | "cryogenic";

export interface Vector2 {
  x: number; // downrange distance (m)
  y: number; // altitude (m)
}

export interface Stage {
  name: string;
  propulsionType: PropulsionType;
  /** Sea-level or vacuum thrust, kN, treated as constant for v1 (no throttle curve yet). */
  thrustKN: number;
  /** Specific impulse, seconds. */
  ispSeconds: number;
  /** Structural (dry) mass of this stage, kg. */
  dryMassKg: number;
  /** Propellant mass available to this stage, kg. */
  propellantMassKg: number;
}

export interface RocketConfig {
  id: string;
  name: string;
  description?: string;
  /** Stages in burn order: index 0 ignites first. */
  stages: Stage[];
  /** Payload mass carried through the whole flight, kg. */
  payloadMassKg: number;
  /** Altitude (m) at which the gravity turn/pitch-over program begins. */
  gravityTurnStartAltitudeM: number;
  /** Drag coefficient, dimensionless (flat approximation for v1). */
  dragCoefficient: number;
  /** Reference cross-sectional area for drag, m^2. */
  crossSectionalAreaM2: number;
}

export interface SimulationState {
  time: number; // seconds since ignition
  position: Vector2; // meters
  velocity: Vector2; // m/s
  mass: number; // kg, current total vehicle mass
  activeStageIndex: number;
  fuelRemainingKg: number;
  thrustKN: number; // current thrust being applied (0 if coasting)
  dynamicPressurePa: number; // for max-Q inspection
}

export type StageEventType =
  | "ignition"
  | "burnout"
  | "separation"
  | "apogee"
  | "impact";

export interface StageEvent {
  type: StageEventType;
  time: number;
  stageIndex: number;
  altitude: number;
}

export type SimulationOutcome = "orbit" | "suborbital" | "failure";

export interface SimulationRun {
  config: RocketConfig;
  telemetry: SimulationState[];
  events: StageEvent[];
  outcome: SimulationOutcome;
  maxAltitudeM: number;
  maxVelocityMs: number;
  totalDeltaVMs: number;
}
