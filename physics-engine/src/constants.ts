export const G0 = 9.80665; // standard gravity, m/s^2, used in Isp -> exhaust velocity conversion
export const EARTH_RADIUS_M = 6_371_000;
export const EARTH_SURFACE_GRAVITY = 9.80665;

// Simplified exponential atmosphere model (sea-level density and scale height).
// Good enough for v1 trajectory work; not a substitute for a full US Standard
// Atmosphere table, which can replace this later without touching the integrator.
export const SEA_LEVEL_AIR_DENSITY = 1.225; // kg/m^3
export const ATMOSPHERE_SCALE_HEIGHT_M = 8_500; // m
export const ATMOSPHERE_CUTOFF_ALTITUDE_M = 100_000; // treat as vacuum above this (Karman line)

export const FIXED_TIMESTEP_S = 0.05; // physics integration step
