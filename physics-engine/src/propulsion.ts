import { G0 } from "./constants";
import { StageConfig, ThrustCurvePoint } from "./types";
import { getAtmosphere } from "./atmosphere";

// -----------------------------------------------------------
// Thrust curve interpolation helpers
// -----------------------------------------------------------

function interpolateCurve(curve: ThrustCurvePoint[], t: number): number {
  if (curve.length === 0) return 0;

  if (t <= curve[0].time) return curve[0].thrust;
  if (t >= curve[curve.length - 1].time) return curve[curve.length - 1].thrust;

  for (let i = 0; i < curve.length - 1; i++) {
    if (t >= curve[i].time && t < curve[i + 1].time) {
      const dt = curve[i + 1].time - curve[i].time;
      if (dt < 1e-12) return curve[i].thrust;
      const frac = (t - curve[i].time) / dt;
      return curve[i].thrust + frac * (curve[i + 1].thrust - curve[i].thrust);
    }
  }

  return curve[curve.length - 1].thrust;
}

// -----------------------------------------------------------
// Thrust curve integration (trapezoidal)
// -----------------------------------------------------------

function integrateCurveSegment(curve: ThrustCurvePoint[], t0: number, t1: number): number {
  if (t1 <= t0 || curve.length < 2) return 0;

  const tt0 = Math.max(t0, curve[0].time);
  const tt1 = Math.min(t1, curve[curve.length - 1].time);
  if (tt1 <= tt0) return 0;

  let integral = 0;
  for (let i = 0; i < curve.length - 1; i++) {
    const segT0 = curve[i].time;
    const segT1 = curve[i + 1].time;

    if (tt1 <= segT0) break;
    if (tt0 >= segT1) continue;

    const start = Math.max(tt0, segT0);
    const end = Math.min(tt1, segT1);
    const segDt = segT1 - segT0;

    if (segDt < 1e-12) continue;

    // Thrust at start and end of this sub-segment (linear interpolation)
    const fracStart = (start - segT0) / segDt;
    const fracEnd = (end - segT0) / segDt;
    const thrustStart = curve[i].thrust + fracStart * (curve[i + 1].thrust - curve[i].thrust);
    const thrustEnd = curve[i].thrust + fracEnd * (curve[i + 1].thrust - curve[i].thrust);

    // Trapezoidal area
    integral += (end - start) * (thrustStart + thrustEnd) / 2;
  }

  return integral;
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Returns thrust (N) at a given time since stage ignition and altitude.
 *
 * Base thrust is interpolated from the stage's thrust curve, then adjusted
 * for ambient pressure using altitude-dependent Isp blending:
 *   T(h) = T_curve * Isp(h) / Isp_vacuum
 *
 * Returns 0 before ignition (t < 0) and after burnout (t > burnTime).
 */
export function getThrust(
  timeSinceIgnition: number,
  stage: StageConfig,
  altitude: number,
): number {
  if (timeSinceIgnition < 0 || timeSinceIgnition > stage.burnTime) return 0;

  const baseThrust = interpolateCurve(stage.thrustCurve, timeSinceIgnition);
  if (baseThrust <= 0) return 0;

  // Altitude-dependent Isp: blend between sea level and vacuum
  const ambientPressure = getAtmosphere(altitude).pressure;
  const seaLevelPressure = getAtmosphere(0).pressure;
  const pressureRatio = seaLevelPressure > 0
    ? Math.min(1, Math.max(0, ambientPressure / seaLevelPressure))
    : 0;

  const isp = stage.ispVacuum - (stage.ispVacuum - stage.ispSeaLevel) * pressureRatio;

  return baseThrust * (isp / stage.ispVacuum);
}

/**
 * Returns total vehicle mass (kg) at a given time since stage ignition.
 *
 * Mass is depleted by integrating the thrust curve and computing propellant
 * consumed proportional to the fraction of total impulse delivered:
 *   m(t) = initialMass - propellantMass * (impulse(0→t) / impulse(0→burnTime))
 *
 * Guaranteed: m(0) = initialMass, m(burnTime) = initialMass - propellantMass.
 * Never returns below dry mass plus upper stages.
 */
export function getMass(
  timeSinceIgnition: number,
  stage: StageConfig,
  initialMass: number,
): number {
  if (timeSinceIgnition <= 0) return initialMass;
  if (timeSinceIgnition >= stage.burnTime) return initialMass - stage.propellantMassKg;

  const totalImpulse = integrateCurveSegment(stage.thrustCurve, 0, stage.burnTime);
  if (totalImpulse <= 0) return initialMass;

  const partialImpulse = integrateCurveSegment(stage.thrustCurve, 0, timeSinceIgnition);
  const propellantConsumed = stage.propellantMassKg * (partialImpulse / totalImpulse);

  const mass = initialMass - propellantConsumed;
  const minMass = initialMass - stage.propellantMassKg;

  return Math.max(mass, minMass);
}
