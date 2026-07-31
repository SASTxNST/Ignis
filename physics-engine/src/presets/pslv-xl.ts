import { RocketConfig, ThrustCurvePoint } from "../types";
import { G0 } from "../constants";

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
 * ISRO PSLV-XL — Polar Satellite Launch Vehicle (XL variant with 6 strap-ons).
 * 4 stages: PS1 + 6 XL strap-ons (solid), PS2 (liquid Vikas), PS3 (solid),
 * PS4 (2x LAM-2 liquid). Public specs; dry masses approximate.
 */
export const PSLV_XL: RocketConfig = {
  id: "pslvxl",
  name: "PSLV-XL",
  description: "Polar Satellite Launch Vehicle XL.",
  payloadMassKg: 1_750,
  launchAngleDeg: 0,
  gravityTurnStartAltitudeM: 1_200,
  gravityTurnRateDegS: 2,
  dragCoefficientCurve: [
    { mach: 0.1, cd: 0.20 },
    { mach: 0.8, cd: 0.22 },
    { mach: 1.0, cd: 0.45 },
    { mach: 1.2, cd: 0.38 },
    { mach: 2.0, cd: 0.30 },
    { mach: 5.0, cd: 0.25 },
  ],
  referenceAreaM2: 6.16,
  stages: [
    {
      name: "PS1 + 6 XL Strap-ons",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(7_200_000, burnDuration(211_000, 280, 7_200_000)),
      dryMassKg: 31_000,
      propellantMassKg: 211_000,
      ispSeaLevel: 262,
      ispVacuum: 280,
      burnTime: burnDuration(211_000, 280, 7_200_000),
    },
    {
      name: "PS2 — Vikas",
      propulsionType: "liquid",
      thrustCurve: constantThrustCurve(799_000, burnDuration(41_000, 300, 799_000)),
      dryMassKg: 5_300,
      propellantMassKg: 41_000,
      ispSeaLevel: 285,
      ispVacuum: 300,
      burnTime: burnDuration(41_000, 300, 799_000),
    },
    {
      name: "PS3 — HPS3",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(240_000, burnDuration(7_600, 300, 240_000)),
      dryMassKg: 1_300,
      propellantMassKg: 7_600,
      ispSeaLevel: 290,
      ispVacuum: 300,
      burnTime: burnDuration(7_600, 300, 240_000),
    },
    {
      name: "PS4 — 2x LAM-2",
      propulsionType: "liquid",
      thrustCurve: constantThrustCurve(14_600, burnDuration(2_500, 315, 14_600)),
      dryMassKg: 920,
      propellantMassKg: 2_500,
      ispSeaLevel: 305,
      ispVacuum: 315,
      burnTime: burnDuration(2_500, 315, 14_600),
    },
  ],
};
