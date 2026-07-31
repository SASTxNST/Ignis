/**
 * This is the correctness gate described in the Ignis process doc:
 * no feature work proceeds past the physics kernel until this passes.
 *
 * Check 1 — Integrator vs. Tsiolkovsky (vacuum, no gravity):
 * Integrates a single stage's thrust/mass-loss with the same RK4 integrator
 * used in simulate.ts, with gravity and drag both zeroed out, and checks the
 * resulting velocity against the closed-form Tsiolkovsky rocket equation.
 *
 * Check 2 — Full-vehicle sanity run:
 * Runs the real Vikram-1 and LVM3 presets through the actual simulate()
 * function (gravity, drag, staging, gravity turn all active) and prints
 * summary stats for human sanity-checking against known public performance.
 */
import { rk4Step } from "./integrator";
import { G0 } from "./constants";
import { simulate, theoreticalDeltaV } from "./simulate";
import { VIKRAM_1, LVM3, FALCON_9 } from "./presets";

function checkIntegratorAgainstTsiolkovsky() {
  const thrustN = 1_200_000; // 1200 kN
  const ispSeconds = 250;
  const dryMassKg = 2_200;
  const propellantMassKg = 11_500;
  const m0 = dryMassKg + propellantMassKg;
  const m1 = dryMassKg;

  const massFlowRateKgS = thrustN / (ispSeconds * G0);
  const burnTimeS = propellantMassKg / massFlowRateKgS;

  // 1D state: [velocity, mass]. No gravity, no drag — pure thrust/mass-loss.
  let state = [0, m0];
  const dt = 0.01;
  let t = 0;
  while (t < burnTimeS) {
    const derivative = (_t: number, y: number[]) => {
      const [, mass] = y;
      return [thrustN / mass, -massFlowRateKgS];
    };
    state = rk4Step(derivative, t, state, dt);
    t += dt;
  }

  const integratedVelocity = state[0];
  const theoreticalVelocity = ispSeconds * G0 * Math.log(m0 / m1);
  const errorPct = (Math.abs(integratedVelocity - theoreticalVelocity) / theoreticalVelocity) * 100;

  console.log("=== Check 1: Integrator vs. Tsiolkovsky (vacuum, no gravity) ===");
  console.log(`  Theoretical Δv : ${theoreticalVelocity.toFixed(3)} m/s`);
  console.log(`  Integrated Δv  : ${integratedVelocity.toFixed(3)} m/s`);
  console.log(`  Error          : ${errorPct.toFixed(4)}%`);

  if (errorPct > 0.1) {
    console.error("  FAIL — integrator does not match Tsiolkovsky within tolerance.");
    process.exitCode = 1;
  } else {
    console.log("  PASS");
  }
}

function runSanityCheck(name: string, config = VIKRAM_1) {
  const run = simulate(config);
  console.log(`\n=== Full-vehicle sanity run: ${name} ===`);
  console.log(`  Theoretical vacuum Δv budget : ${theoreticalDeltaV(config).toFixed(0)} m/s`);
  console.log(`  Max altitude reached         : ${(run.maxAltitudeM / 1000).toFixed(1)} km`);
  console.log(`  Max velocity reached         : ${run.maxVelocityMs.toFixed(0)} m/s`);
  console.log(`  Outcome                      : ${run.outcome}`);
  console.log(`  Events:`);
  for (const e of run.events) {
    console.log(`    t=${e.time.toFixed(1)}s  ${e.type.padEnd(11)} stage=${e.stageIndex} alt=${(e.altitude / 1000).toFixed(1)}km`);
  }
}

checkIntegratorAgainstTsiolkovsky();
runSanityCheck("Vikram-1", VIKRAM_1);
runSanityCheck("LVM3", LVM3);
runSanityCheck("Falcon 9", FALCON_9);
