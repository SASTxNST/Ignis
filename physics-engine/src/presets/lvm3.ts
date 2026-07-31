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
 * ISRO LVM3 (GSLV Mk III) — used for Chandrayaan-2 and Chandrayaan-3.
 * 3 stages: 2x S200 solid boosters (modeled as one combined stage),
 * L110 liquid core, C25 cryogenic upper stage.
 *
 * Note: The S200 boosters burn in parallel with the L110 core in reality,
 * not sequentially. Modeling them as a combined first stage is a temporary
 * simplification until parallel-staging support is added.
 */
export const LVM3: RocketConfig = {
  id: "lvm3",
  name: "LVM3 (GSLV Mk III)",
  description: "ISRO 3-stage medium-lift vehicle used for Chandrayaan-2 and Chandrayaan-3.",
  payloadMassKg: 4_000,
  launchAngleDeg: 0,
  gravityTurnStartAltitudeM: 2_000,
  gravityTurnRateDegS: 2,
  dragCoefficientCurve: [
    { mach: 0.1, cd: 0.20 },
    { mach: 0.8, cd: 0.22 },
    { mach: 1.0, cd: 0.45 },
    { mach: 1.2, cd: 0.38 },
    { mach: 2.0, cd: 0.30 },
    { mach: 5.0, cd: 0.25 },
  ],
  referenceAreaM2: Math.PI * (4.0 / 2) ** 2,
  stages: [
    {
      name: "Stage 1 — 2x S200 solid boosters",
      propulsionType: "solid",
      thrustCurve: constantThrustCurve(5_150_000 * 2, burnDuration(205_000 * 2, 280, 5_150_000 * 2)),
      dryMassKg: (236_000 - 205_000) * 2,
      propellantMassKg: 205_000 * 2,
      ispSeaLevel: 260,
      ispVacuum: 280,
      burnTime: burnDuration(205_000 * 2, 280, 5_150_000 * 2),
    },
    {
      name: "Stage 2 — L110 liquid core",
      propulsionType: "liquid",
      thrustCurve: constantThrustCurve(1_692_000, burnDuration(116_000, 300, 1_692_000)),
      dryMassKg: 12_000,
      propellantMassKg: 116_000,
      ispSeaLevel: 285,
      ispVacuum: 300,
      burnTime: burnDuration(116_000, 300, 1_692_000),
    },
    {
      name: "Stage 3 — C25 cryogenic upper stage",
      propulsionType: "cryogenic",
      thrustCurve: constantThrustCurve(186_000, burnDuration(28_000, 450, 186_000)),
      dryMassKg: 5_000,
      propellantMassKg: 28_000,
      ispSeaLevel: 430,
      ispVacuum: 450,
      burnTime: burnDuration(28_000, 450, 186_000),
    },
  ],
};
