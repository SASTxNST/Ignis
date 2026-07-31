import { G0 } from "./constants";
import { RocketConfig } from "./types";

/**
 * Theoretical vacuum delta-v budget via the Tsiolkovsky rocket equation,
 * summed stage-by-stage. Uses vacuum Isp for each stage (ideal case).
 * Gravity and drag losses are NOT subtracted — this is the ideal upper bound.
 */
export function theoreticalDeltaV(config: RocketConfig): number {
  let totalDeltaV = 0;

  for (let i = 0; i < config.stages.length; i++) {
    const stage = config.stages[i];

    // Mass of all stages above this one (including payload) that ride along as dead weight during this burn.
    let massAbove = config.payloadMassKg;
    for (let j = i + 1; j < config.stages.length; j++) {
      massAbove += config.stages[j].dryMassKg + config.stages[j].propellantMassKg;
    }

    const m0 = stage.dryMassKg + stage.propellantMassKg + massAbove;
    const m1 = stage.dryMassKg + massAbove;
    totalDeltaV += stage.ispVacuum * G0 * Math.log(m0 / m1);
  }

  return totalDeltaV;
}

/**
 * Validation check 1: Integrator vs. Tsiolkovsky (vacuum, no gravity, no drag).
 * Compares the adaptive integrator's output to the closed-form rocket equation.
 *
 * NOTE: Requires Phase 7 (Numerical Integrator) to be implemented.
 * Stubbed until then.
 */
export function checkIntegratorVsTsiolkovsky(): void {
  console.log("=== Check 1: Integrator vs. Tsiolkovsky ===");
  console.log("  SKIPPED — requires Phase 7 (adaptive integrator).");
}

/**
 * Validation check 2: Full-vehicle sanity run.
 * Runs real presets through the full simulate() and prints summary.
 *
 * NOTE: Requires Phase 9 (Full Flight Assembly) to be implemented.
 * Stubbed until then.
 */
export function runSanityCheck(): void {
  console.log("=== Check 2: Full-vehicle sanity run ===");
  console.log("  SKIPPED — requires Phase 9 (full flight assembly).");
}
