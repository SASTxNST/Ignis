import { RocketConfig, ThrustCurvePoint } from "../types";
import { G0 } from "../constants";

// Compute burn duration from total impulse conservation:
//   burnTime = propellantMassKg * Isp * g0 / totalThrust
function burnDuration(propellantKg: number, isp: number, thrustN: number): number {
  return (propellantKg * isp * G0) / thrustN;
}

function constantThrustCurve(thrustN: number, burnS: number): ThrustCurvePoint[] {
  return [
    { time: 0, thrust: thrustN },
    { time: burnS * 0.5, thrust: thrustN },
    { time: burnS, thrust: thrustN },
  ];
}

/**
 * Skyroot Aerospace Vikram-1 — India's first privately built orbital launch
 * vehicle. Small-lift, 4 stages (3 solid + 1 liquid kick stage).
 * Figures are public specs; dry masses are approximate where not published.
 */
export const VIKRAM_1: RocketConfig = {
  id: "vikram-1",
  name: "Vikram-1",
  description: "Skyroot Aerospace 4-stage small-lift orbital launch vehicle.",
  payloadMassKg: 350,
  launchAngleDeg: 0,
  gravityTurnStartAltitudeM: 1_000,
  gravityTurnRateDegS: 2,
  dragCoefficientCurve: [
    { mach: 0.1, cd: 0.20 },
    { mach: 0.8, cd: 0.22 },
    { mach: 1.0, cd: 0.45 },
    { mach: 1.2, cd: 0.38 },
    { mach: 2.0, cd: 0.30 },
    { mach: 5.0, cd: 0.25 },
  ],
  referenceAreaM2: Math.PI * (1.7 / 2) ** 2,
  stages: [
    {
      name: "Stage 1 — Kalam-1200",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(1_200_000, burnDuration(11_500, 260, 1_200_000)),
      dryMassKg: 2_200,
      propellantMassKg: 11_500,
      ispSeaLevel: 240,
      ispVacuum: 260,
      burnTime: burnDuration(11_500, 260, 1_200_000),
    },
    {
      name: "Stage 2 — Kalam-250",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(250_000, burnDuration(2_400, 260, 250_000)),
      dryMassKg: 550,
      propellantMassKg: 2_400,
      ispSeaLevel: 240,
      ispVacuum: 260,
      burnTime: burnDuration(2_400, 260, 250_000),
    },
    {
      name: "Stage 3 — Kalam-100",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(100_000, burnDuration(1_000, 260, 100_000)),
      dryMassKg: 260,
      propellantMassKg: 1_000,
      ispSeaLevel: 240,
      ispVacuum: 260,
      burnTime: burnDuration(1_000, 260, 100_000),
    },
    {
      name: "Stage 4 — 4x Raman-1 (kick stage)",
      propulsionType: "liquid",
      thrustCurve: constantThrustCurve(3_400, burnDuration(180, 315, 3_400)),
      dryMassKg: 120,
      propellantMassKg: 180,
      ispSeaLevel: 300,
      ispVacuum: 315,
      burnTime: burnDuration(180, 315, 3_400),
    },
  ],
};
