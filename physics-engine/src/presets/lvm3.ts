import { RocketConfig } from "../types";

/**
 * ISRO LVM3 (GSLV Mk III) — used for Chandrayaan-2 and Chandrayaan-3.
 * 3 stages: 2x S200 solid boosters (modeled as one combined stage for v1,
 * since they burn in parallel with the core rather than in series — see
 * note below), L110 liquid core, C25 cryogenic upper stage.
 *
 * Note on staging model: v1's simulate() assumes strictly sequential stages.
 * The S200 boosters actually burn in parallel with L110 ignition overlapping
 * near the end of the boost phase. Modeling them as a combined first "stage"
 * (summed thrust, S200 Isp, summed masses) is a deliberate v1 simplification;
 * true parallel-staging support is a good candidate for a v2 engine upgrade.
 */
export const LVM3: RocketConfig = {
  id: "lvm3",
  name: "LVM3 (GSLV Mk III)",
  description: "ISRO 3-stage medium-lift vehicle used for Chandrayaan-2 and Chandrayaan-3.",
  payloadMassKg: 4_000,
  gravityTurnStartAltitudeM: 2_000,
  dragCoefficient: 0.3,
  crossSectionalAreaM2: Math.PI * (4.0 / 2) ** 2, // core diameter approx.
  stages: [
    {
      name: "Stage 1 — 2x S200 solid boosters",
      propulsionType: "solid",
      thrustKN: 5_150 * 2,
      ispSeconds: 274.5,
      dryMassKg: (236_000 - 205_000) * 2,
      propellantMassKg: 205_000 * 2,
    },
    {
      name: "Stage 2 — L110 liquid core",
      propulsionType: "liquid",
      thrustKN: 1_692,
      ispSeconds: 293,
      dryMassKg: 12_000, // approximate — public dry mass not precisely published
      propellantMassKg: 116_000,
    },
    {
      name: "Stage 3 — C25 cryogenic upper stage",
      propulsionType: "cryogenic",
      thrustKN: 186,
      ispSeconds: 442,
      dryMassKg: 5_000, // approximate
      propellantMassKg: 28_000,
    },
  ],
};
