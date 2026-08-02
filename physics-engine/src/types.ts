// ============================================================
// Ignis Physics Engine — Core Type System
// 3DOF Planar Point-Mass Simulation
// SI units throughout: meters, kg, seconds, Newtons, Pascals, K
// ============================================================

// -----------------------------------------------------------
// 1. Vectors & Geometry
// -----------------------------------------------------------

/** 2D vector for planar (3DOF) trajectory simulation */
export interface Vector2 {
  /** Downrange distance (m) */
  x: number;
  /** Altitude above mean sea level (m) */
  y: number;
}

// -----------------------------------------------------------
// 2. Continuous ODE State & Derivative
// -----------------------------------------------------------

/**
 * Order of the ODE state vector: [x, y, vx, vy, mass]
 *   x    — downrange distance (m)
 *   y    — altitude above MSL (m)
 *   vx   — downrange velocity (m/s)
 *   vy   — vertical velocity (m/s)
 *   mass — total instantaneous vehicle mass (kg)
 */
export type StateVector = [number, number, number, number, number];

/**
 * Derivative vector in the same order: [vx, vy, ax, ay, dmdt]
 *   vx, vy — time derivatives of position (= velocity components) (m/s)
 *   ax, ay — time derivatives of velocity (= acceleration components) (m/s²)
 *   dmdt   — mass depletion rate (kg/s), negative during burn
 */
export type DerivativeVector = [number, number, number, number, number];

/** Human-readable snapshot of rocket state at one instant */
export interface RocketState {
  /** Mission elapsed time (s) */
  time: number;
  /** Position vector: { x: downrange (m), y: altitude (m) } */
  position: Vector2;
  /** Velocity vector (m/s) */
  velocity: Vector2;
  /** Total instantaneous vehicle mass (kg) */
  mass: number;
  /** 0-based index of currently burning stage; -1 if all stages depleted (coasting) */
  activeStageIndex: number;
  /** Propellant mass remaining in the active stage (kg); 0 if coasting */
  propellantMassRemaining: number;
  /** Current thrust magnitude (N); 0 if coasting between stages */
  thrustMagnitude: number;
  /** Dynamic pressure: 0.5 * rho * v^2 (Pa) */
  dynamicPressure: number;
  /** Mach number: velocity / local speed of sound (dimensionless) */
  machNumber: number;
  /**
   * Individual force vectors acting on the vehicle at this instant (N).
   * Present on telemetry snapshots produced by the integrator (Phase 7+).
   */
  forces?: ForceVectors;
  /** Resulting acceleration vector (m/s^2) */
  acceleration?: Vector2;
}

// -----------------------------------------------------------
// 3. Propulsion
// -----------------------------------------------------------

/** One data point on a thrust-vs-time curve */
export interface ThrustCurvePoint {
  /** Seconds since stage ignition (s) */
  time: number;
  /** Thrust force (N) */
  thrust: number;
}

export type PropulsionType = "solid" | "liquid" | "cryogenic";

/** Configuration for one propulsion stage */
export interface StageConfig {
  /** Human-readable stage name (e.g. "S200 Booster") */
  name: string;
  /** Propellant type classification */
  propulsionType: PropulsionType;
  /** Thrust vs. time after ignition (at vacuum conditions); interpolation source */
  thrustCurve: ThrustCurvePoint[];
  /** Dry (structural) mass of this stage after propellant depletion (kg) */
  dryMassKg: number;
  /** Total propellant mass carried by this stage (kg) */
  propellantMassKg: number;
  /** Specific impulse at sea level (seconds) */
  ispSeaLevel: number;
  /** Specific impulse in vacuum (seconds) */
  ispVacuum: number;
  /** Total burn duration of this stage (s) */
  burnTime: number;
}

// -----------------------------------------------------------
// 4. Aerodynamics
// -----------------------------------------------------------

/** One data point on a drag-coefficient-vs-Mach-number curve */
export interface DragCoefficientPoint {
  /** Mach number (dimensionless) */
  mach: number;
  /** Drag coefficient (dimensionless) */
  cd: number;
}

// -----------------------------------------------------------
// 5. Complete Rocket Configuration
// -----------------------------------------------------------

/** Complete rocket vehicle definition */
export interface RocketConfig {
  /** Unique identifier (e.g. "vikram-1") */
  id: string;
  /** Display name (e.g. "Vikram-1") */
  name: string;
  /** Optional longer description */
  description?: string;

  // --- Propulsion ---
  /** Stages in burn order: index 0 ignites first */
  stages: StageConfig[];

  // --- Mass ---
  /** Payload mass that rides through the entire flight (kg) */
  payloadMassKg: number;

  // --- Launch & Guidance ---
  /** Launch angle from vertical (degrees); 0 = straight up, 90 = horizontal */
  launchAngleDeg: number;
  /** Altitude at which the pitch-over / gravity-turn program begins (m) */
  gravityTurnStartAltitudeM: number;
  /** Pitch-over rate for gravity turn (degrees per second) */
  gravityTurnRateDegS: number;

  // --- Aerodynamics ---
  /** Mach-dependent drag coefficient curve */
  dragCoefficientCurve: DragCoefficientPoint[];
  /** Aerodynamic reference (cross-sectional) area (m^2) */
  referenceAreaM2: number;
}

// -----------------------------------------------------------
// 6. Force Model
// -----------------------------------------------------------

/** Breakout of individual force vectors acting on the vehicle */
export interface ForceVectors {
  /** Thrust force (N) */
  thrust: Vector2;
  /** Gravitational force (N) */
  gravity: Vector2;
  /** Aerodynamic drag force (N) */
  drag: Vector2;
  /** Vector sum of all forces (N) */
  total: Vector2;
}

/** Complete output of a single force-computation call */
export interface ForceOutput {
  /** Individual force vectors */
  forces: ForceVectors;
  /** Mass flow rate (kg/s); positive = propellant being consumed */
  massFlowRate: number;
  /** Dynamic pressure (Pa) */
  dynamicPressure: number;
  /** Current Mach number (dimensionless) */
  machNumber: number;
  /** Resulting acceleration vector (m/s^2) */
  acceleration: Vector2;
}

// -----------------------------------------------------------
// 7. Atmosphere
// -----------------------------------------------------------

/** Atmospheric properties at a given altitude (ISA model output) */
export interface AtmosphericState {
  /** Temperature (K) */
  temperature: number;
  /** Static pressure (Pa) */
  pressure: number;
  /** Air density (kg/m^3) */
  density: number;
  /** Speed of sound (m/s) */
  speedOfSound: number;
  /** Dynamic viscosity (Pa·s, equivalent to kg/(m·s)) */
  dynamicViscosity: number;
}

// -----------------------------------------------------------
// 8. Simulation Events & Results
// -----------------------------------------------------------

// -----------------------------------------------------------
// Wind
// -----------------------------------------------------------

export interface WindState {

  /** Horizontal wind velocity (m/s) */
  velocity: Vector2;

  /** Magnitude (m/s) */
  speed: number;

  /** Direction (degrees) */
  directionDeg: number;

}

export interface WindLayer {

  minAltitude: number;

  maxAltitude: number;

  speed: number;

  directionDeg: number;

}





export type StageEventType =
  | "ignition"
  | "burnout"
  | "separation"
  | "apogee"
  | "maxq"
  | "transonic"
  | "impact";

/** A discrete event occurring during the flight */
export interface StageEvent {
  /** Event type */
  type: StageEventType;
  /** Mission elapsed time (s) */
  time: number;
  /** Stage index relevant to this event (0-based; -1 if not stage-specific) */
  stageIndex: number;
  /** Altitude at event time (m) */
  altitude: number;
}

export type SimulationOutcome = "orbit" | "suborbital" | "failure";

/** Complete result of one simulation run */
export interface SimulationRun {
  /** The rocket configuration that was simulated */
  config: RocketConfig;
  /** Time-ordered telemetry snapshots */
  telemetry: RocketState[];
  /** Discrete events that occurred during flight */
  events: StageEvent[];
  /** Overall outcome classification */
  outcome: SimulationOutcome;
  /** Peak altitude (m) */
  maxAltitudeM: number;
  /** Peak velocity (m/s) */
  maxVelocityMs: number;
  /** Peak Mach number */
  maxMach: number;
  /** Maximum dynamic pressure (Pa) */
  maxQ: number;
  /** Total ideal delta-v from Tsiolkovsky equation (m/s) */
  totalDeltaVMs: number;
  /** Apogee altitude (m) */
  apogeeAltitudeM: number;
  /** Time of apogee (s) */
  apogeeTime: number;
  /** Time of ground impact (s) */
  impactTime: number;
  /** Velocity at ground impact (m/s) */
  impactVelocityMs: number;
}

// -----------------------------------------------------------
// 9. Simulation Options
// -----------------------------------------------------------

/** Tunable parameters for the simulation engine */
export interface SimulationOptions {
  /** Maximum wall-clock simulation time before forced termination (s) */
  maxTimeS: number;
  /** Relative tolerance for the adaptive ODE solver */
  solverRelativeTolerance: number;
  /** Absolute tolerance for the adaptive ODE solver */
  solverAbsoluteTolerance: number;
  /** Record telemetry every Nth solver step (higher = sparser output) */
  telemetryRecordStride: number;
}

/** Default simulation options */
export const DEFAULT_SIMULATION_OPTIONS: SimulationOptions = {
  maxTimeS: 3000,
  solverRelativeTolerance: 1e-9,
  solverAbsoluteTolerance: 1e-9,
  telemetryRecordStride: 10,
};


export enum WindModelType {
    NONE = "none",
    CONSTANT = "constant",
    LAYERED = "layered",
    NOAA = "noaa",
    TURBULENT = "turbulent",
}