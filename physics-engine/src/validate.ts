import { EARTH_RADIUS_M, G0 } from "./constants";
import { RocketConfig, StateVector } from "./types";
import { DerivativeOptions } from "./forces";
import { integrateSpan, IntegratorOptions, simulate } from "./integrator";
import { reportTrajectory } from "./trajectoryValidator";
import { VIKRAM_1 } from "./presets/vikram1";
import { LVM3 } from "./presets/lvm3";

export { theoreticalDeltaV } from "./deltaV";
import { theoreticalDeltaV } from "./deltaV";

import { validateWindModel } from "./tests/windValidation";

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
  if (reference === 0) return measured === 0 ? 0 : Infinity;
  return (Math.abs(measured - reference) / Math.abs(reference)) * 100;
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

export function checkVacuumProjectile(): boolean {
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

  return altitudeErrPct < ERROR_BUDGET_PCT && gravityErrPct < ERROR_BUDGET_PCT;
}

// -----------------------------------------------------------
// Test 2 — Convergence test (spec Section 3.7)
// -----------------------------------------------------------

export function checkConvergence(): boolean {
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

  return deltaConstantG < ERROR_BUDGET_PCT && deltaProduction < ERROR_BUDGET_PCT;
}

// -----------------------------------------------------------
// Test 3 — Tsiolkovsky consistency (Vikram-1, vacuum, staged)
// -----------------------------------------------------------

export function checkTsiolkovsky(): boolean {
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

  return deltaVErrPct < ERROR_BUDGET_PCT;
}

// -----------------------------------------------------------
// Phase 8 — Production-model analytical reference (spec Section 3.7, step 1)
// -----------------------------------------------------------
//
// The Phase 7 vacuum-projectile test used CONSTANT-g, because that has a
// closed-form solution (y_apogee = v_y^2 / 2g). But the PRODUCTION model uses
// inverse-square gravity, so its correct analytical reference is NOT the
// constant-g parabola — it is the energy-conservation apogee of a purely
// vertical ballistic launch under g(h) = G0 * (R/(R+h))^2.
//
// Derivation (1D vertical, no thrust/drag; x-velocity stays zero so there is
// no angular-momentum term to carry kinetic energy at apogee):
//   Specific energy:   e = v^2/2 - mu/(R+h)        with mu = G0 * R^2
//   At launch (h=0):   e0 = v0^2/2 - mu/R
//   At apogee (v=0):   e1 = -mu/(R + h_apogee)
//   Conservation e0 = e1:
//     v0^2/2 - mu/R = -mu/(R + h_apogee)
//     => mu/(R + h_apogee) = mu/R - v0^2/2
//     => R + h_apogee = mu / (mu/R - v0^2/2) = R / (1 - v0^2 R / (2 mu))
//     => h_apogee = R/(1 - v0^2 R/(2 mu)) - R = (v0^2 * R * R) / (2 * mu - v0^2 * R)
//
// This is the formally-correct 0.0597% reference for the production model
// that validate.ts deferred from Phase 7. We assert against THIS, not the
// constant-g closed form (which legitimately differs by ~0.1% at 6.4 km).

/** Gravitational parameter mu = G0 * R^2 (m^3/s^2), from recorded constants. */
const MU = G0 * EARTH_RADIUS_M * EARTH_RADIUS_M;

/**
 * Analytical apogee altitude (m) for a vertical vacuum launch at speed v0
 * under inverse-square gravity. Equivalent rearrangement:
 *   h = R/(1 - v0^2*R/(2*mu)) - R   =   (v0^2 * R * R) / (2*mu - v0^2*R)
 * (These are algebraically identical; avoid forms with a `1 + v0^2 R/(2 mu)` denominator, which are not equivalent.)
 */
export function inverseSquareVerticalApogee(v0: number): number {
  const denom = 1 - (v0 * v0 * EARTH_RADIUS_M) / (2 * MU);
  if (denom <= 0) return Infinity; // at/above escape energy — never returns
  return EARTH_RADIUS_M / denom - EARTH_RADIUS_M;
}

/**
 * Phase 8, Test — Vertical vacuum launch vs energy-conservation closed form.
 *
 * Launches straight up at v0 with NO thrust, NO drag, and the production
 * inverse-square gravity model (no gravityMs2 override). Compares the
 * integrated apogee altitude to inverseSquareVerticalApogee(v0). This is the
 * check that the 0.0597% budget formally applies to the model that ships.
 *
 * Note: runProjectile uses `getStateDerivative` via the same production path,
 * so a carry-through of the integrator's vy-sign detection is sufficient; the
 * test deliberately uses a sub-orbital v0 well below escape velocity.
 */
function checkInverseSquareApogee(): { errorPct: number; pass: boolean } {
  console.log("=== Phase 8: Inverse-square gravity vs energy-conservation apogee ===");

  const v0 = 500; // m/s — sub-orbital, well below escape; h_apogee ~ 6.4 km
  const reference = inverseSquareVerticalApogee(v0);
  // Time to apogee is not closed-form here; integrate well past the expected
  // ballistic time. A generous upper bound: vertical free-fall time under
  // constant g0 (~2*v0/G0 * 2 for margin).
  const tEnd = (2 * v0 / G0) * 2.5;

  console.log("  Launch: vertical, v0 =", v0, "m/s, no thrust, no drag");
  console.log("  Reference apogee (energy conservation, inverse-square):", reference.toFixed(6), "m");

  const y0: StateVector = [0, 0, 0, v0, 1000];
  const derOpts: DerivativeOptions = {
    enableThrust: false,
    enableDrag: false,
    enableGravity: true, // production inverse-square model; NO gravityMs2 override
  };

  const result = runProjectile(VIKRAM_1, y0, tEnd, derOpts, 1e-9);

  const altitudeErrPct = pctError(result.apogeeAltitudeM, reference);
  const pass = Math.abs(altitudeErrPct) < ERROR_BUDGET_PCT;

  console.log("  Simulated apogee altitude:", result.apogeeAltitudeM.toFixed(6), "m");
  console.log("  Apogee altitude error vs inverse-square reference:", altitudeErrPct.toExponential(4), "%");
  console.log(
    `  ${pass ? "PASS" : "FAIL"} apogee error must be < ${ERROR_BUDGET_PCT}% vs the correct production reference ->`,
    altitudeErrPct.toExponential(4), "%",
  );
  console.log("  (This is the formally-correct 0.0597% reference for the");
  console.log("   production inverse-square model, deferred from Phase 7.)");

  return { errorPct: altitudeErrPct, pass };
}

// -----------------------------------------------------------
// Phase 9 — Full-flight trajectory plausibility (spec Section 5, step 4)
// -----------------------------------------------------------

/**
 * Runs full simulate() for preset vehicles with the production force models
 * (drag + inverse-square gravity + guidance) and asserts the trajectory has
 * the physically-expected shape: monotone powered ascent, exactly one apogee,
 * monotone descent, no negative altitude, no oscillation. This is the Phase 9
 * "looks-like-a-real-rocket" gate, distinct from the Phase 7/8 accuracy checks.
 */
function checkTrajectoryPlausibility(): boolean {
  const vikram = reportTrajectory("Vikram-1", simulate(VIKRAM_1));
  console.log("");
  const lvm3 = reportTrajectory("LVM3", simulate(LVM3));
  return vikram.pass && lvm3.pass;
}

// -----------------------------------------------------------
// Main entry (runs when validate.ts is executed directly)
// -----------------------------------------------------------

/**
 * Runs the full validation suite (Phase 7 checks + the Phase 8 inverse-square
 * energy-conservation reference) and prints a clear pass/fail report with the
 * actual error percentages produced by every check — not just "tests passed".
 * Returns true only if every check passed.
 */
export function runValidationSuite(): boolean {
  console.log("==============================================");
  console.log("Ignis Physics Engine — Validation Suite (Phases 7-9)");
  console.log("Error budget: 0.0597% (apogee / Tsiolkovsky delta-V)");
  console.log("==============================================");

  const checks: Array<{ name: string; pass: boolean }> = [];

  checks.push({ name: "Phase 7 Test 1 — vacuum projectile vs constant-g closed form", pass: checkVacuumProjectile() });
  console.log("");
  checks.push({ name: "Phase 7 Test 2 — convergence (tolerance tightening)", pass: checkConvergence() });
  console.log("");
  checks.push({ name: "Phase 7 Test 3 — Tsiolkovsky delta-V consistency", pass: checkTsiolkovsky() });
  console.log("");
  const invSq = checkInverseSquareApogee();
  checks.push({ name: "Phase 8 — inverse-square gravity vs energy-conservation apogee", pass: invSq.pass });
  console.log("");
  checks.push({ name: "Phase 9 — trajectory plausibility (Vikram-1 & LVM3)", pass: checkTrajectoryPlausibility() });
  console.log("");

  console.log("==============================================");
  console.log("VALIDATION SUITE SUMMARY (error budget 0.0597%)");
  console.log("==============================================");
  let allPass = true;
  for (const c of checks) {
    console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}`);
    if (!c.pass) allPass = false;
  }
  console.log("==============================================");
  console.log(allPass ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED");
  console.log("==============================================");
  return allPass;
}

declare var require: any;
declare var module: any;
declare var process: any;

function main(): void {
  const ok = runValidationSuite();
  if (!ok) process.exitCode = 1;
}

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  main();
}

validateWindModel();

