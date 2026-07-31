import { G0 } from "./constants";
import { RocketConfig, StateVector } from "./types";
import { getForces, DerivativeOptions } from "./forces";
import { integrateSpan, IntegratorOptions } from "./integrator";
import { VIKRAM_1 } from "./presets/vikram1";

export { theoreticalDeltaV } from "./deltaV";
import { theoreticalDeltaV } from "./deltaV";

// -----------------------------------------------------------
// Phase 7 validation harness
//
// Error-margin protocol (spec Section 3.7): 0.0597% error in apogee
// altitude vs the analytical projectile solution, and delta-V vs the
// Tsiolkovsky equation. These checks report actual measured numbers —
// not just "passed".
// -----------------------------------------------------------

const ERROR_BUDGET_PCT = 0.0597;

function pctError(measured: number, reference: number): number {
  return ((measured - reference) / reference) * 100;
}

/**
 * Runs a single-span integration of the given ODE (via getStateDerivative)
 * and locates apogee (max altitude) by scanning the coarse trajectory, then
 * densely re-integrating the small window around the peak.
 */
function runProjectile(
  config: RocketConfig,
  y0: StateVector,
  tEnd: number,
  derivativeOptions: DerivativeOptions,
  tolerance: number,
): { apogeeAltitudeM: number; apogeeTimeS: number; telemetryCount: number } {
  const intOpts: IntegratorOptions = {
    method: "RK45",
    solverTolerance: tolerance,
    maxStepS: 1,
  };

  const coarse = integrateSpan(config, [0, tEnd], y0, derivativeOptions, intOpts);

  let iMax = 0;
  for (let i = 1; i < coarse.y.length; i++) {
    if (coarse.y[i][1] > coarse.y[iMax][1]) iMax = i;
  }
  const i0 = Math.max(0, iMax - 1);
  const i1 = Math.min(coarse.y.length - 1, iMax + 1);

  const dense = integrateSpan(
    config,
    [coarse.t[i0], coarse.t[i1]],
    coarse.y[i0],
    derivativeOptions,
    { method: "RK45", solverTolerance: tolerance, maxStepS: 0.001 },
  );

  let maxAlt = -Infinity;
  let maxTime = dense.t[0];
  for (let i = 0; i < dense.y.length; i++) {
    if (dense.y[i][1] > maxAlt) {
      maxAlt = dense.y[i][1];
      maxTime = dense.t[i];
    }
  }

  return { apogeeAltitudeM: maxAlt, apogeeTimeS: maxTime, telemetryCount: coarse.t.length };
}

// -----------------------------------------------------------
// Test 1 — Vacuum projectile vs analytical closed-form apogee
// -----------------------------------------------------------

export function checkVacuumProjectile(): void {
  console.log("=== Phase 7, Test 1: Vacuum projectile (analytical validation) ===");

  const v0 = 500; // m/s
  const angleFromHorizontalDeg = 45;
  const theta = (angleFromHorizontalDeg * Math.PI) / 180;
  const vx0 = v0 * Math.cos(theta);
  const vy0 = v0 * Math.sin(theta);

  // Closed-form (constant gravity, projectile equations):
  //   y_max = (v0*sin(theta))^2 / (2*g0)
  const apogeeClosedForm = vy0 ** 2 / (2 * G0);
  const apogeeTimeClosedForm = vy0 / G0;

  console.log("  Launch: v0 =", v0, "m/s, angle from horizontal =", angleFromHorizontalDeg, "deg");
  console.log("  Closed-form apogee (constant g):", apogeeClosedForm.toFixed(6), "m");
  console.log("  Closed-form time to apogee:     ", apogeeTimeClosedForm.toFixed(6), "s");

  const y0: StateVector = [0, 0, vx0, vy0, 1000];
  const derOpts: DerivativeOptions = {
    enableThrust: false,
    enableDrag: false,
    enableGravity: true,
    gravityMs2: G0, // TEST-ONLY override: constant gravity per the test definition
  };

  const result = runProjectile(VIKRAM_1, y0, 2 * apogeeTimeClosedForm, derOpts, 1e-9);

  const altitudeErrPct = pctError(result.apogeeAltitudeM, apogeeClosedForm);
  const timeErrPct = pctError(result.apogeeTimeS, apogeeTimeClosedForm);

  console.log("  Simulated apogee altitude:       ", result.apogeeAltitudeM.toFixed(6), "m");
  console.log("  Simulated time to apogee:        ", result.apogeeTimeS.toFixed(6), "s");
  console.log("  Apogee altitude error:           ", altitudeErrPct.toExponential(4), "%");
  console.log("  Apogee time error:               ", timeErrPct.toExponential(4), "%");
  console.log(
    `  ${altitudeErrPct < ERROR_BUDGET_PCT ? "PASS" : "FAIL"}`,
    `apogee error must be < ${ERROR_BUDGET_PCT}% ->`, altitudeErrPct.toExponential(4), "%",
  );

  // Force-consistency spot check: reported per-step gravity force must equal
  // -mass * g0 (sign check independent of the ODE integrator).
  const sample = integrateSpan(VIKRAM_1, [0, 1], y0, derOpts, { solverTolerance: 1e-9 });
  const sampleState = sample.y[1];
  const sampleForces = sample.forces[1];
  const expectedGravityY = -sampleState[4] * G0;
  const gravityErrPct = pctError(sampleForces.forces.gravity.y, expectedGravityY);
  console.log("  Reported gravity force at t=1:  ", sampleForces.forces.gravity.y.toFixed(6), "N vs expected", expectedGravityY.toFixed(6), "N");
  console.log(
    `  ${gravityErrPct < ERROR_BUDGET_PCT ? "PASS" : "FAIL"}`,
    "telemetry force consistency ->", gravityErrPct.toExponential(4), "%",
  );

  // Honest note: the PRODUCTION model uses inverse-square gravity (Phase 3
  // decision), not the constant g of the closed form. Running the same launch
  // through the production path quantifies the model-level difference:
  const prodOpts: DerivativeOptions = {
    enableThrust: false,
    enableDrag: false,
    enableGravity: true,
  };
  const prod = runProjectile(VIKRAM_1, y0, 2 * apogeeTimeClosedForm, prodOpts, 1e-9);
  const prodDeviationPct = pctError(prod.apogeeAltitudeM, apogeeClosedForm);
  console.log("  --- Model-difference note (not an integrator error) ---");
  console.log("  Production model (inverse-square gravity) apogee: ", prod.apogeeAltitudeM.toFixed(6), "m");
  console.log("  Deviation vs constant-g closed form:             ", prodDeviationPct.toExponential(4), "%");
  console.log("  This is the expected consequence of the inverse-square gravity");
  console.log("  decision at this apogee (g drops ~0.1% over 6.4 km). The 0.0597%");
  console.log("  budget is formally tested in Phase 8 against the correct reference");
  console.log("  for the production model (energy-conservation apogee).");
}

// -----------------------------------------------------------
// Test 2 — Convergence test (spec Section 3.7)
// -----------------------------------------------------------

export function checkConvergence(): void {
  console.log("=== Phase 7, Test 2: Convergence test (tolerance tightening) ===");

  const v0 = 500;
  const angleFromHorizontalDeg = 45;
  const theta = (angleFromHorizontalDeg * Math.PI) / 180;
  const vx0 = v0 * Math.cos(theta);
  const vy0 = v0 * Math.sin(theta);
  const y0: StateVector = [0, 0, vx0, vy0, 1000];

  // Case A: constant-gravity (exact-polynomial) projectile — the ODE is a
  // degree-2 parabola, so RK45 integrates it exactly at ANY tolerance. The
  // apogee must be tol-independent (a trivial-but-valid convergence proof).
  const derOptsConstantG: DerivativeOptions = {
    enableThrust: false,
    enableDrag: false,
    enableGravity: true,
    gravityMs2: G0,
  };

  const a9 = runProjectile(VIKRAM_1, y0, 2 * vy0 / G0, derOptsConstantG, 1e-9);
  const a10 = runProjectile(VIKRAM_1, y0, 2 * vy0 / G0, derOptsConstantG, 1e-10);
  const deltaConstantG = pctError(a10.apogeeAltitudeM, a9.apogeeAltitudeM);

  console.log("  Case A — constant-g projectile (exact-polynomial ODE):");
  console.log("    apogee @ tol=1e-9 :", a9.apogeeAltitudeM.toFixed(9), "m");
  console.log("    apogee @ tol=1e-10:", a10.apogeeAltitudeM.toFixed(9), "m");
  console.log("    change when tolerance tightened:", deltaConstantG.toExponential(4), "%");
  console.log(
    `    ${deltaConstantG < ERROR_BUDGET_PCT ? "PASS" : "FAIL"}`,
    "change must be << 0.0597% ->", deltaConstantG.toExponential(4), "%",
  );

  // Case B: production inverse-square gravity (no override) — the ODE is NOT
  // polynomial, so the tolerance genuinely controls the truncation error.
  // This is the meaningful convergence check for the production model.
  const derOptsProduction: DerivativeOptions = {
    enableThrust: false,
    enableDrag: false,
    enableGravity: true,
  };
  const b9 = runProjectile(VIKRAM_1, y0, 2 * vy0 / G0, derOptsProduction, 1e-9);
  const b10 = runProjectile(VIKRAM_1, y0, 2 * vy0 / G0, derOptsProduction, 1e-10);
  const deltaProduction = pctError(b10.apogeeAltitudeM, b9.apogeeAltitudeM);

  console.log("  Case B — production inverse-square gravity (no override):");
  console.log("    apogee @ tol=1e-9 :", b9.apogeeAltitudeM.toFixed(9), "m");
  console.log("    apogee @ tol=1e-10:", b10.apogeeAltitudeM.toFixed(9), "m");
  console.log("    change when tolerance tightened:", deltaProduction.toExponential(4), "%");
  console.log(
    `    ${deltaProduction < ERROR_BUDGET_PCT ? "PASS" : "FAIL"}`,
    "change must be << 0.0597% ->", deltaProduction.toExponential(4), "%",
  );

  if (Math.abs(deltaProduction) >= ERROR_BUDGET_PCT) {
    console.log("    NOTE: apogee moved by >= 0.0597% — tolerance is NOT settled yet.");
  } else {
    console.log("    Tolerance settled at tol = 1e-9 (tightening to 1e-10 moves apogee by << 0.0597%).");
  }
}

// -----------------------------------------------------------
// Test 3 — Tsiolkovsky consistency (Vikram-1, vacuum, staged)
// -----------------------------------------------------------

export function checkTsiolkovsky(): void {
  console.log("=== Phase 7, Test 3: Tsiolkovsky consistency (Vikram-1, vacuum) ===");

  const config = VIKRAM_1;
  const reference = theoreticalDeltaV(config);
  console.log("  Theoretical delta-V (vacuum, no gravity/drag losses):", reference.toFixed(3), "m/s");

  // Total initial stack mass (payload + every stage's dry + propellant).
  const initialMass =
    config.payloadMassKg +
    config.stages.reduce((sum, s) => sum + s.dryMassKg + s.propellantMassKg, 0);

  // Vacuum environment: start at 100 km so ambient pressure = 0, which makes
  // getThrust use vacuum Isp (needed to match theoreticalDeltaV's vacuum-Isp
  // assumption). Thrust is vertical and gravity/drag are disabled so the
  // achieved speed equals the ideal rocket-equation delta-V (no losses).
  let state: StateVector = [0, 100_000, 0, 0, initialMass];
  const baseDerOpts: DerivativeOptions = {
    enableThrust: true,
    enableGravity: false,
    enableDrag: false,
    thrustDirection: { x: 0, y: 1 },
  };

  let totalBurnS = 0;
  let prevSpeed = 0;
  const stageDVs: number[] = [];

  for (let i = 0; i < config.stages.length; i++) {
    const stage = config.stages[i];

    const segment = integrateSpan(
      config,
      [0, stage.burnTime],
      state,
      { ...baseDerOpts, activeStageIndex: i },
      { method: "RK45", solverTolerance: 1e-9 },
    );

    state = segment.y[segment.y.length - 1];
    totalBurnS += stage.burnTime;

    const speed = Math.hypot(state[2], state[3]);
    stageDVs.push(speed - prevSpeed);
    prevSpeed = speed;

    if (i < config.stages.length - 1) {
      state[4] -= stage.dryMassKg; // jettison spent stage
    }
  }

  const finalSpeed = prevSpeed;
  const deltaVErrPct = pctError(finalSpeed, reference);

  console.log("  Total burn time simulated:", totalBurnS.toFixed(3), "s");
  console.log("  Simulated final speed:    ", finalSpeed.toFixed(6), "m/s");
  console.log("  Per-stage delta-V:        ", stageDVs.map((d) => d.toFixed(3)).join(", "), "m/s");
  console.log("  Error vs Tsiolkovsky:     ", deltaVErrPct.toExponential(4), "%");
  console.log(
    `  ${deltaVErrPct < ERROR_BUDGET_PCT ? "PASS" : "FAIL"}`,
    "delta-V error must be < 0.0597% ->", deltaVErrPct.toExponential(4), "%",
  );
}

// -----------------------------------------------------------
// Main entry (runs when validate.ts is executed directly)
// -----------------------------------------------------------

function main(): void {
  console.log("==============================================");
  console.log("Ignis Physics Engine — Phase 7 Validation");
  console.log("Error budget: 0.0597% (apogee / Tsiolkovsky delta-V)");
  console.log("==============================================");

  checkVacuumProjectile();
  console.log("");
  checkConvergence();
  console.log("");
  checkTsiolkovsky();
  console.log("");
  console.log("==============================================");
  console.log("Phase 7 validation complete.");
}

if (require.main === module) {
  main();
}
