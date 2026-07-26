import {
  ATMOSPHERE_CUTOFF_ALTITUDE_M,
  ATMOSPHERE_SCALE_HEIGHT_M,
  EARTH_RADIUS_M,
  EARTH_SURFACE_GRAVITY,
  SEA_LEVEL_AIR_DENSITY,
} from "./constants";

/**
 * Simplified exponential atmosphere: rho(h) = rho0 * e^(-h / H).
 * Returns 0 above the Karman line so drag vanishes cleanly in "vacuum" flight.
 */
export function airDensityAt(altitudeM: number): number {
  if (altitudeM >= ATMOSPHERE_CUTOFF_ALTITUDE_M || altitudeM < 0) return 0;
  return SEA_LEVEL_AIR_DENSITY * Math.exp(-altitudeM / ATMOSPHERE_SCALE_HEIGHT_M);
}

/**
 * Gravity decreasing with altitude via inverse-square law from Earth's center.
 * At h=0 this returns EARTH_SURFACE_GRAVITY; a "constant gravity" v1 test can
 * instead just pass a fixed value where needed.
 */
export function gravityAt(altitudeM: number): number {
  const r = EARTH_RADIUS_M + Math.max(altitudeM, 0);
  return EARTH_SURFACE_GRAVITY * (EARTH_RADIUS_M / r) ** 2;
}
