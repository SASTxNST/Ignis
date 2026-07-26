import { RocketConfig } from "../types";

/**
 * Skyroot Aerospace Vikram-1 — India's first privately built orbital launch
 * vehicle, first flown 18 July 2026. Small-lift, 4 stages (3 solid + 1 liquid
 * kick stage). Figures are public specs; treated as best-available approximations
 * where exact per-stage dry mass isn't published (marked below).
 */
export const VIKRAM_1: RocketConfig = {
  id: "vikram-1",
  name: "Vikram-1",
  description: "Skyroot Aerospace 4-stage small-lift orbital launch vehicle.",
  payloadMassKg: 350,
  gravityTurnStartAltitudeM: 1_000,
  dragCoefficient: 0.3,
  crossSectionalAreaM2: Math.PI * (1.7 / 2) ** 2,
  stages: [
    {
      name: "Stage 1 — Kalam-1200",
      propulsionType: "solid",
      thrustKN: 1200,
      ispSeconds: 250,
      dryMassKg: 2_200, // approximate — carbon-composite motor case
      propellantMassKg: 11_500,
    },
    {
      name: "Stage 2 — Kalam-250",
      propulsionType: "solid",
      thrustKN: 250,
      ispSeconds: 250,
      dryMassKg: 550,
      propellantMassKg: 2_400,
    },
    {
      name: "Stage 3 — Kalam-100",
      propulsionType: "solid",
      thrustKN: 100,
      ispSeconds: 250,
      dryMassKg: 260,
      propellantMassKg: 1_000,
    },
    {
      name: "Stage 4 — 4x Raman-1 (kick stage)",
      propulsionType: "liquid",
      thrustKN: 3.4,
      ispSeconds: 310,
      dryMassKg: 120,
      propellantMassKg: 180,
    },
  ],
};
