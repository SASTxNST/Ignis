export const EDUCATION_COPY = {
  deltaV: {
    title: "Δv (Delta-v)",
    text:
      "Delta-v is the total velocity change a rocket can produce by burning all its propellant — it's the real budget for reaching orbit, not thrust or fuel mass alone. More isn't automatically better: extra propellant adds mass that the rocket also has to accelerate, so past a point it stops paying for itself.",
  },
  gravityTurn: {
    title: "Gravity Turn",
    text:
      "A rocket launches vertically, then gradually pitches over onto a curved path — this is the gravity turn. Going straight up the whole way would waste enormous energy fighting gravity instead of building the horizontal speed needed to stay in orbit, so the ascent bends over early and lets gravity itself help steer the trajectory.",
  },
  staging: {
    title: "Staging",
    text:
      "Multi-stage rockets discard each stage's empty tanks and engines once its propellant is spent, rather than hauling that dead weight the rest of the way. Dropping the used-up mass means the remaining stages only have to accelerate what's left — payload and fuel that's still useful — which is why staging significantly increases overall efficiency.",
  },
} as const;