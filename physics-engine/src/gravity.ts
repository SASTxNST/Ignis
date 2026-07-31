import { G0, EARTH_RADIUS_M } from "./constants";

/**
 * Gravitational acceleration at a given geometric altitude using the
 * inverse-square law: g(h) = G0 * (R / (R + h))²
 *
 * G0 = 9.80665 m/s²  (standard gravity at mean sea level)
 * R  = 6,371,000 m    (Earth mean radius)
 */
export function getGravity(altitudeMeters: number): number {
  const h = Math.max(altitudeMeters, 0);
  const r = EARTH_RADIUS_M + h;
  return G0 * (EARTH_RADIUS_M / r) ** 2;
}
