// ============================================================
// Phase 12.1 — Atmospheric Wind Model
//
// Provides horizontal wind velocity as a function of altitude.
// The model is intentionally independent from drag so it can
// later support:
//   • Constant wind
//   • Layered wind
//   • NOAA soundings
//   • Turbulence
//   • Gusts
//
// All speeds are SI (m/s).
// ============================================================

import { Vector2 } from "../types";

/**
 * Wind state returned by the environment model.
 */
export interface WindState {
  /** Horizontal wind vector (m/s) */
  velocity: Vector2;

  /** Wind speed magnitude (m/s) */
  speed: number;

  /**
   * Direction TOWARD which the air moves.
   *
   * 0°   = +X
   * 90°  = +Y
   */
  directionDeg: number;
}

/**
 * One atmospheric wind layer.
 */
export interface WindLayer {
  /** Base altitude (m) */
  minAltitude: number;

  /** Top altitude (m) */
  maxAltitude: number;

  /** Horizontal wind speed (m/s) */
  speed: number;

  /** Direction (degrees) */
  directionDeg: number;
}

/**
 * Default layered atmosphere.
 *
 * Based loosely on typical launch-day conditions.
 */
const DEFAULT_WIND_PROFILE: WindLayer[] = [
  {
    minAltitude: 0,
    maxAltitude: 1000,
    speed: 4,
    directionDeg: 0,
  },
  {
    minAltitude: 1000,
    maxAltitude: 5000,
    speed: 10,
    directionDeg: 5,
  },
  {
    minAltitude: 5000,
    maxAltitude: 12000,
    speed: 22,
    directionDeg: 15,
  },
  {
    minAltitude: 12000,
    maxAltitude: 20000,
    speed: 38,
    directionDeg: 20,
  },
  {
    minAltitude: 20000,
    maxAltitude: Number.POSITIVE_INFINITY,
    speed: 28,
    directionDeg: 10,
  },
];

/**
 * Returns wind state at altitude.
 *
 * Current implementation:
 *   Piecewise-constant layered atmosphere.
 *
 * Future:
 *   Linear interpolation
 *   Weather balloons
 *   NOAA
 *   Turbulence
 */
export function getWind(
  altitudeMeters: number,
): WindState {

  const altitude = Math.max(0, altitudeMeters);

  const layer =
    DEFAULT_WIND_PROFILE.find(
      l =>
        altitude >= l.minAltitude &&
        altitude < l.maxAltitude,
    ) ?? DEFAULT_WIND_PROFILE[DEFAULT_WIND_PROFILE.length - 1];

  const theta = layer.directionDeg * Math.PI / 180;

  const velocity: Vector2 = {
    x: layer.speed * Math.cos(theta),
    y: layer.speed * Math.sin(theta),
  };

  return {
    velocity,
    speed: layer.speed,
    directionDeg: layer.directionDeg,
  };
}