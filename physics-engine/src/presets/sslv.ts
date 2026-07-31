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
 * ISRO SSLV — Small Satellite Launch Vehicle.
 * 4 stages: SS1 (S85 solid), SS2 (S7 solid), SS3 (S4 solid), Velocity
 * Trimming Module (liquid). Public specs; dry masses approximate.
 */
export const SSLV: RocketConfig = {
  id: "sslv",
  name: "SSLV",
  description: "Small Satellite Launch Vehicle.",
  payloadMassKg: 500,
  launchAngleDeg: 0,
  gravityTurnStartAltitudeM: 900,
  gravityTurnRateDegS: 2,
  dragCoefficientCurve: [
    { mach: 0.1, cd: 0.20 },
    { mach: 0.8, cd: 0.22 },
    { mach: 1.0, cd: 0.45 },
    { mach: 1.2, cd: 0.38 },
    { mach: 2.0, cd: 0.30 },
    { mach: 5.0, cd: 0.25 },
  ],
  referenceAreaM2: 3.14,
  stages: [
    {
      name: "SS1 — S85",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(2_400_000, burnDuration(87_000, 280, 2_400_000)),
      dryMassKg: 10_000,
      propellantMassKg: 87_000,
      ispSeaLevel: 265,
      ispVacuum: 280,
      burnTime: burnDuration(87_000, 280, 2_400_000),
    },
    {
      name: "SS2 — S7",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(700_000, burnDuration(7_700, 290, 700_000)),
      dryMassKg: 3_000,
      propellantMassKg: 7_700,
      ispSeaLevel: 275,
      ispVacuum: 290,
      burnTime: burnDuration(7_700, 290, 700_000),
    },
    {
      name: "SS3 — S4",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(260_000, burnDuration(4_500, 296, 260_000)),
      dryMassKg: 900,
      propellantMassKg: 4_500,
      ispSeaLevel: 283,
      ispVacuum: 296,
      burnTime: burnDuration(4_500, 296, 260_000),
    },
    {
      name: "Velocity Trimming Module",
      propulsionType: "liquid",
      thrustCurve: constantThrustCurve(2_000, burnDuration(55, 320, 2_000)),
      dryMassKg: 250,
      propellantMassKg: 55,
      ispSeaLevel: 310,
      ispVacuum: 320,
      burnTime: burnDuration(55, 320, 2_000),
    },
  ],
};
