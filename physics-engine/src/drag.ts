import type { ForceVectors, RocketConfig, Vector2, DragCoefficientPoint } from "./types";
import { getAtmosphere } from "./atmosphere";

function interpolateCd(curve: DragCoefficientPoint[], mach: number): number {
  if (curve.length === 0) return 0;
  if (mach <= curve[0].mach) return curve[0].cd;
  if (mach >= curve[curve.length - 1].mach) return curve[curve.length - 1].cd;

  for (let i = 0; i < curve.length - 1; i++) {
    if (mach >= curve[i].mach && mach < curve[i + 1].mach) {
      const dm = curve[i + 1].mach - curve[i].mach;
      if (dm < 1e-12) return curve[i].cd;
      const frac = (mach - curve[i].mach) / dm;
      return curve[i].cd + frac * (curve[i + 1].cd - curve[i].cd);
    }
  }
  return curve[curve.length - 1].cd;
}

/**
 * Computes aerodynamic drag force at a given velocity and altitude.
 *
 * Drag magnitude: F_drag = 0.5 * rho * v^2 * Cd(M) * A_ref
 *   where Cd(M) comes from the rocket's Mach-dependent drag coefficient curve
 *   (smooth transonic rise around Mach 1 is defined by the curve points).
 *
 * Direction always opposes velocity. Returns zero at v = 0.
 */
export function getDrag(
  velocity: number,
  altitude: number,
  config: RocketConfig,
): ForceVectors {
  const speed = Math.abs(velocity);

  const zero: ForceVectors = {
    thrust: { x: 0, y: 0 },
    gravity: { x: 0, y: 0 },
    drag: { x: 0, y: 0 },
    total: { x: 0, y: 0 },
  };

  if (speed < 1e-12) return zero;

  const atmo = getAtmosphere(altitude);
  const mach = speed / atmo.speedOfSound;
  const Cd = interpolateCd(config.dragCoefficientCurve, mach);
  const q = 0.5 * atmo.density * speed * speed;
  const dragMag = q * Cd * config.referenceAreaM2;

  // Drag opposes velocity direction
  const direction: Vector2 = {
    x: -(velocity / speed),
    y: 0,
  };

  const drag: Vector2 = {
    x: direction.x * dragMag,
    y: 0,
  };

  return {
    thrust: { x: 0, y: 0 },
    gravity: { x: 0, y: 0 },
    drag,
    total: drag,
  };
}
