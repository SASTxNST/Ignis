// ============================================================
// Ignis Physics Engine — Physical Constants
// All values in SI units
// ============================================================

// -----------------------------------------------------------
// Earth parameters
// -----------------------------------------------------------

/** Standard gravitational acceleration at mean sea level (m/s^2) */
export const G0: number = 9.80665;

/** Earth mean radius (m) */
export const EARTH_RADIUS_M: number = 6_371_000;

// -----------------------------------------------------------
// ISA sea-level conditions (International Standard Atmosphere)
// -----------------------------------------------------------

/** Sea-level temperature (K) */
export const ISA_TEMPERATURE_SEA_LEVEL: number = 288.15; // 15°C

/** Sea-level pressure (Pa) */
export const ISA_PRESSURE_SEA_LEVEL: number = 101_325;

/** Sea-level air density (kg/m^3) */
export const ISA_DENSITY_SEA_LEVEL: number = 1.225;

/** Sea-level speed of sound (m/s) */
export const ISA_SPEED_OF_SOUND_SEA_LEVEL: number = 340.294;

// -----------------------------------------------------------
// ISA layer definitions
// -----------------------------------------------------------

/** Troposphere lapse rate (K/m) — temperature decreases 6.5 K per 1000 m */
export const ISA_LAPSE_RATE_TROPOSPHERE: number = 0.0065;

/** Tropopause altitude (m) */
export const ISA_TROPOPAUSE_ALTITUDE: number = 11_000;

/** Tropopause temperature (K) */
export const ISA_TROPOPAUSE_TEMPERATURE: number = 216.65; // -56.5°C

/** Tropopause pressure (Pa) */
export const ISA_TROPOPAUSE_PRESSURE: number = 22_632;

/** Tropopause density (kg/m^3) */
export const ISA_TROPOPAUSE_DENSITY: number = 0.3639;

/** Stratosphere (isothermal) ceiling (m) */
export const ISA_STRATOSPHERE_ISOTHERMAL_CEILING: number = 20_000;

/** Stratosphere isothermal temperature (K) — same as tropopause */
export const ISA_STRATOSPHERE_ISOTHERMAL_TEMPERATURE: number = 216.65;

// -----------------------------------------------------------
// Gas constants
// -----------------------------------------------------------

/** Specific gas constant for dry air (J/(kg·K)) */
export const GAS_CONSTANT_AIR: number = 287.0528;

/** Ratio of specific heats for air (dimensionless, gamma = cp/cv) */
export const GAMMA_AIR: number = 1.4;

// -----------------------------------------------------------
// Dynamic viscosity parameters (Sutherland's law)
// -----------------------------------------------------------

/** Reference temperature for Sutherland's law (K) */
export const SUTHERLAND_REF_TEMPERATURE: number = 273.15;

/** Reference dynamic viscosity at SUTHERLAND_REF_TEMPERATURE (Pa·s) */
export const SUTHERLAND_REF_VISCOSITY: number = 1.716e-5;

/** Sutherland constant for air (K) */
export const SUTHERLAND_CONSTANT: number = 110.4;

// -----------------------------------------------------------
// Upper atmosphere layer boundaries (geometric altitude, m)
// -----------------------------------------------------------

/** Top of stratosphere layer 1 (+1.0 K/km) */
export const ISA_STRATOSPHERE_1_CEILING: number = 32_000;

/** Top of stratosphere layer 2 (+2.8 K/km) */
export const ISA_STRATOSPHERE_2_CEILING: number = 47_000;

/** Top of stratosphere layer 3 (isothermal) */
export const ISA_STRATOSPHERE_3_CEILING: number = 51_000;

/** Top of mesosphere layer 1 (-2.8 K/km) */
export const ISA_MESOSPHERE_1_CEILING: number = 71_000;

/** Top of mesosphere layer 2 (-2.0 K/km) */
export const ISA_MESOSPHERE_2_CEILING: number = 84_852;

/** Top of mesopause (isothermal) */
export const ISA_MESOPAUSE_CEILING: number = 90_000;

/** Lapse rate in stratosphere layer 1 (K/m) */
export const ISA_LAPSE_RATE_STRATOSPHERE_1: number = 0.001;

/** Lapse rate in stratosphere layer 2 (K/m) */
export const ISA_LAPSE_RATE_STRATOSPHERE_2: number = 0.0028;

/** Lapse rate in mesosphere layer 1 (K/m) — negative because temperature decreases */
export const ISA_LAPSE_RATE_MESOSPHERE_1: number = -0.0028;

/** Lapse rate in mesosphere layer 2 (K/m) */
export const ISA_LAPSE_RATE_MESOSPHERE_2: number = -0.002;

// -----------------------------------------------------------
// Simulation defaults
// -----------------------------------------------------------

/** Altitude above which we treat atmosphere as vacuum (m) */
export const ATMOSPHERE_CUTOFF_ALTITUDE_M: number = 100_000;

/** Default maximum simulation time (s) */
export const DEFAULT_MAX_TIME_S: number = 3000;
