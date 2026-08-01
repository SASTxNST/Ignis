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

    // Mass of all stages above this one (including payload) that ride along
    // as dead weight during this burn.
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
