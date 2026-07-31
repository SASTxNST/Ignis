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
 * SpaceX Falcon 9 Block 5 — medium-lift partially reusable launch vehicle.
 * 2 stages (9x Merlin 1D boosters, 1x Merlin 1D Vacuum upper stage).
 * Public specs; dry masses approximate.
 */
export const FALCON_9: RocketConfig = {
  id: "falcon9",
  name: "Falcon 9 Block 5",
  description: "SpaceX 2-stage partially reusable medium-lift launch vehicle.",
  payloadMassKg: 22_800,
  launchAngleDeg: 0,
  gravityTurnStartAltitudeM: 1_500,
  gravityTurnRateDegS: 2,
  dragCoefficientCurve: [
    { mach: 0.1, cd: 0.20 },
    { mach: 0.8, cd: 0.22 },
    { mach: 1.0, cd: 0.45 },
    { mach: 1.2, cd: 0.38 },
    { mach: 2.0, cd: 0.30 },
    { mach: 5.0, cd: 0.25 },
  ],
  referenceAreaM2: 10.75,
  stages: [
    {
      name: "Stage 1 — 9x Merlin 1D",
      propulsionType: "liquid",
      thrustCurve: constantThrustCurve(7_607_000, burnDuration(411_000, 311, 7_607_000)),
      dryMassKg: 25_600,
      propellantMassKg: 411_000,
      ispSeaLevel: 282,
      ispVacuum: 311,
      burnTime: burnDuration(411_000, 311, 7_607_000),
    },
    {
      name: "Stage 2 — Merlin 1D Vacuum",
      propulsionType: "liquid",
      thrustCurve: constantThrustCurve(981_000, burnDuration(92_670, 348, 981_000)),
      dryMassKg: 4_000,
      propellantMassKg: 92_670,
      ispSeaLevel: 282,
      ispVacuum: 348,
      burnTime: burnDuration(92_670, 348, 981_000),
    },
  ],
};
