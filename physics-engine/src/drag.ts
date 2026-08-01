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
 * Full drag computation detail — drag vector plus the flow quantities that
 * produced it (dynamic pressure, Mach number, local density/speed of sound,
 * interpolated drag coefficient). Exposed so the integrator can report
 * per-step telemetry forces consistent with the drag used inside the ODE.
 */
export interface DragDetails {
  /** Drag force vector (N), opposing the velocity vector */
  drag: Vector2;
  /** Speed magnitude (m/s) */
  speed: number;
  /** Local air density (kg/m^3) */
  density: number;
  /** Local speed of sound (m/s) */
  speedOfSound: number;
  /** Mach number: speed / speedOfSound (dimensionless) */
  machNumber: number;
  /** Interpolated drag coefficient at this Mach number (dimensionless) */
  dragCoefficient: number;
  /** Dynamic pressure: 0.5 * rho * v^2 (Pa) */
  dynamicPressure: number;
}

export function getDragDetails(
  velocity: Vector2,
  altitude: number,
  config: RocketConfig,
): DragDetails {
  const speed = Math.hypot(velocity.x, velocity.y);

  const atmo = getAtmosphere(altitude);
  const machNumber = speed / atmo.speedOfSound;
  const dragCoefficient = interpolateCd(config.dragCoefficientCurve, machNumber);
  const dynamicPressure = 0.5 * atmo.density * speed * speed;
  const dragMag = dynamicPressure * dragCoefficient * config.referenceAreaM2;

  // Drag opposes the full velocity vector; zero at v = 0
  const drag: Vector2 =
    speed < 1e-12
      ? { x: 0, y: 0 }
      : {
          x: -(velocity.x / speed) * dragMag,
          y: -(velocity.y / speed) * dragMag,
        };

  return {
    drag,
    speed,
    density: atmo.density,
    speedOfSound: atmo.speedOfSound,
    machNumber,
    dragCoefficient,
    dynamicPressure,
  };
}

/**
 * Computes aerodynamic drag force at a given 2D velocity and altitude.
 *
 * Drag magnitude: F_drag = 0.5 * rho * v^2 * Cd(M) * A_ref
 *   where Cd(M) comes from the rocket's Mach-dependent drag coefficient curve
 *   (smooth transonic rise around Mach 1 is defined by the curve points).
 *
 * Direction always opposes the full velocity vector. Returns zero at v = 0.
 */
export function getDrag(
  velocity: Vector2,
  altitude: number,
  config: RocketConfig,
): ForceVectors {
  const { drag } = getDragDetails(velocity, altitude, config);

  return {
    thrust: { x: 0, y: 0 },
    gravity: { x: 0, y: 0 },
    drag,
    total: drag,
  };
}
