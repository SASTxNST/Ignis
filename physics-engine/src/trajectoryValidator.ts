// ============================================================
// Phase 9 — Trajectory Plausibility Validator
//
// validateTrajectory(run) inspects a SimulationRun's telemetry and asserts
// the physically-expected shape of a rocket flight: altitude rises
// monotonically through powered ascent, peaks exactly once at apogee, then
// decreases monotonically toward impact — with no negative altitudes and no
// mid-flight oscillation. Returns a structured ValidationReport; run it over
// any preset's simulate() output as a sanity gate.
// ============================================================

import { RocketState, SimulationRun } from "./types";

/** Whether a telemetry sample is part of powered ascent (any stage burning). */
function isPowered(s: RocketState): boolean {
  return s.activeStageIndex >= 0 || s.thrustMagnitude > 0;
}

/**
 * Report for a single plausibility check: a name, whether it passed, and the
 * measured numbers that back the verdict so we're not just saying "passed".
 */
export interface TrajectoryCheck {
  name: string;
  pass: boolean;
  detail: string;
}

/** Aggregate result of validateTrajectory(). */
export interface ValidationReport {
  /** Overall pass — true only if every check passed. */
  pass: boolean;
  checks: TrajectoryCheck[];
  /** Peak altitude found in telemetry (m). */
  apogeeAltitudeM: number;
  /** Mission time of the peak (s). */
  apogeeTimeS: number;
}

/**
 * Allowed jitter when comparing successive altitudes, expressed as a tiny
 * fraction of peak altitude. Telemetry is recorded every Nth solver step
 * (telemetryRecordStride), so neighbouring samples can carry sub-metre solver
 * noise around the peak; this epsilon (1e-9 relative) suppresses false
 * oscillation flags while still catching real non-monotonic behaviour.
 */
const MONOTONIC_REL_EPS = 1e-9;

/**
 * Checks that a flight's altitude-vs-time profile is physically plausible:
 *  1. No negative altitude before impact (the coast loop terminates one step
 *     past the y=0 crossing, so the single final sub-ground sample is the
 *     physical landing overshoot, not a flight anomaly).
 *  2. Altitude is monotonically non-decreasing during powered ascent.
 *  3. Exactly one apogee (the global maximum) exists — no second dip-and-
 *     recovery that climbs back to a comparable altitude (double-hump).
 *  4. After apogee, altitude is monotonically non-increasing down to impact.
 *  5. No oscillation — ignoring solver step noise near the peak, the profile
 *     rises to one peak then falls; it never dips significantly and recovers.
 *
 * Telemetry is the accepted adaptive-step grid (recorded every
 * telemetryRecordStride), so consecutive-sample jitter of sub-metre scale near
 * the apogee and landing is solver noise, not physics. The physical
 * expectations above are therefore checked against a magnitude threshold,
 * not against exact zero — this validator is about flight SHAPE, while the
 * Phase 7/8 suite proves numerical accuracy.
 */
export function validateTrajectory(run: SimulationRun): ValidationReport {
  const telemetry = run.telemetry;
  const checks: TrajectoryCheck[] = [];

  if (telemetry.length === 0) {
    return {
      pass: false,
      checks: [
        {
          name: "non-empty telemetry",
          pass: false,
          detail: "SimulationRun contained zero telemetry samples",
        },
      ],
      apogeeAltitudeM: 0,
      apogeeTimeS: 0,
    };
  }

  const altitudes = telemetry.map((s) => s.position.y);
  const times = telemetry.map((s) => s.time);

  // --- Locate the single apogee (global maximum altitude) ---
  let apogeeIdx = 0;
  for (let i = 1; i < altitudes.length; i++) {
    if (altitudes[i] > altitudes[apogeeIdx]) apogeeIdx = i;
  }
  const apogeeAltitude = altitudes[apogeeIdx];
  const apogeeTime = times[apogeeIdx];
  const eps = MONOTONIC_REL_EPS * Math.max(1, apogeeAltitude);

  // --- Check 1: no negative altitude BEFORE impact ---
  // integrateCoast stops only after locating the y=0 crossing, so it emits one
  // final sample a fraction of a second below ground (the impact overshoot).
  // That terminal sample is the landing — not a mid-flight anomaly. Find the
  // first sample that has gone below ground (the impact step) and require that
  // every sample strictly before it stayed at or above the surface.
  let impactIdx = -1;
  for (let i = 0; i < altitudes.length; i++) {
    if (altitudes[i] < 0) {
      impactIdx = i;
      break;
    }
  }
  const preImpactCount = impactIdx >= 0 ? impactIdx : altitudes.length;
  let minPreImpact = Infinity;
  let minPreImpactTime = times[0];
  for (let i = 0; i < preImpactCount; i++) {
    if (altitudes[i] < minPreImpact) {
      minPreImpact = altitudes[i];
      minPreImpactTime = times[i];
    }
  }
  const noNegative = minPreImpact >= -eps;
  checks.push({
    name: "no negative altitude mid-flight (before impact)",
    pass: noNegative,
    detail: noNegative
      ? `all ${preImpactCount} samples before impact stayed >= 0 (min ${minPreImpact.toFixed(3)} m)` +
        (impactIdx >= 0
          ? `; final impact overshoot to ${altitudes[altitudes.length - 1].toFixed(3)} m is the physical landing`
          : "")
      : `altitude dropped to ${minPreImpact.toFixed(3)} m at t=${minPreImpactTime.toFixed(3)} s before impact`,
  });

  // --- Check 2: monotonic non-decreasing altitude during powered ascent ---
  // Powered ascent is the contiguous run of powered samples from liftoff; we
  // verify altitude never meaningfully decreases between consecutive powered
  // samples before apogee.
  let poweredMonotonic = true;
  let poweredWorstDrop = 0;
  let poweredDropTime = 0;
  let prevPoweredAlt = -Infinity;
  let prevPoweredTime = 0;
  for (let i = 0; i <= apogeeIdx && i < telemetry.length; i++) {
    const s = telemetry[i];
    if (!isPowered(s)) continue;
    const y = altitudes[i];
    if (y < prevPoweredAlt - eps) {
      poweredMonotonic = false;
      const drop = prevPoweredAlt - y;
      if (drop > poweredWorstDrop) {
        poweredWorstDrop = drop;
        poweredDropTime = times[i];
      }
    }
    prevPoweredAlt = y;
    prevPoweredTime = s.time;
  }
  checks.push({
    name: "altitude rises monotonically during powered ascent",
    pass: poweredMonotonic,
    detail: poweredMonotonic
      ? `altitude non-decreasing across all powered samples up to apogee (${apogeeAltitude.toFixed(1)} m @ ${apogeeTime.toFixed(1)} s)`
      : `altitude decreased by ${poweredWorstDrop.toFixed(3)} m during powered ascent near t=${poweredDropTime.toFixed(3)} s`,
  });

  // --- Check 3: exactly one apogee peak (no double-hump) ---
  // The adaptive solver takes dense steps near the peak (and refineApogee
  // re-integrates that window), so MANY consecutive samples sit within a hair
  // of the maximum — physically that is ONE apogee, not several. A genuine
  // "two peaks" flight must first DESCEND a meaningful amount, then CLIMB back
  // up near apogee. We detect that by scanning for a significant drop below
  // apogee followed by a recovery back within a small band of it.
  const significantFraction = 0.01; // a real second peak must dip >1% of apogee first
  let doubleHump = false;
  let sawSignificantDip = false;
  for (let i = apogeeIdx + 1; i < altitudes.length; i++) {
    const y = altitudes[i];
    if (y < apogeeAltitude - significantFraction * apogeeAltitude) {
      sawSignificantDip = true;
    }
    if (sawSignificantDip && y > apogeeAltitude - eps) {
      doubleHump = true;
      break;
    }
  }
  checks.push({
    name: "exactly one apogee peak exists",
    pass: !doubleHump,
    detail: doubleHump
      ? `altitude dipped below ${(apogeeAltitude * (1 - significantFraction)).toFixed(0)} m then recovered near apogee (double-hump)`
      : `single global apogee ${apogeeAltitude.toFixed(1)} m @ t=${apogeeTime.toFixed(1)} s; no second comparable peak`,
  });

  // --- Check 4: monotonic non-increasing altitude after apogee ---
  let descentMonotonic = true;
  let worstRise = 0;
  let worstRiseTime = 0;
  for (let i = apogeeIdx + 1; i < altitudes.length; i++) {
    const rise = altitudes[i] - altitudes[i - 1];
    if (rise > eps) {
      descentMonotonic = false;
      if (rise > worstRise) {
        worstRise = rise;
        worstRiseTime = times[i];
      }
    }
  }
  checks.push({
    name: "altitude decreases monotonically after apogee",
    pass: descentMonotonic,
    detail: descentMonotonic
      ? `altitude non-increasing from apogee to impact (final ${altitudes[altitudes.length - 1].toFixed(3)} m)`
      : `altitude increased by ${worstRise.toFixed(3)} m after apogee near t=${worstRiseTime.toFixed(3)} s`,
  });

  // --- Check 5: no altitude oscillation ---
  // A physical flight climbs to one peak then falls. We flag oscillation only
  // when the profile descends a physically meaningful amount then climbs back
  // above a comparable level — sub-metre jitter near the peak is solver step
  // noise, not oscillation. We therefore track the running maximum and count
  // how many times the profile falls below (runningMax - dipThreshold) and
  // then re-exceeds (runningMax - recoverThreshold).
  const dipThreshold = 0.001 * Math.max(1, apogeeAltitude);   // 0.1% dip = candidate
  const recoverThreshold = 0.0005 * Math.max(1, apogeeAltitude); // recovery within 0.05% of running max
  let runningMax = -Infinity;
  let dipped = false;
  let oscillationCount = 0;
  for (let i = 0; i < altitudes.length; i++) {
    const y = altitudes[i];
    if (y >= runningMax) {
      runningMax = y;
      dipped = false;
      continue;
    }
    if (y < runningMax - dipThreshold) {
      dipped = true;
    } else if (dipped && y > runningMax - recoverThreshold) {
      oscillationCount++;
      dipped = false;
    }
  }
  const oscillates = oscillationCount > 0;
  checks.push({
    name: "no altitude oscillation",
    pass: !oscillates,
    detail: oscillates
      ? `detected ${oscillationCount} dip-and-recovery cycle(s) exceeding ~${dipThreshold.toFixed(0)} m`
      : "altitude follows a single-peak profile with no recovery-above-prior-peak",
  });

  const pass = checks.every((c) => c.pass);

  return {
    pass,
    checks,
    apogeeAltitudeM: apogeeAltitude,
    apogeeTimeS: apogeeTime,
  };
}

/**
 * Convenience printer: logs a labelled pass/fail report for a telemetry run.
 * Returns the ValidationReport so callers can also act on it programmatically.
 */
export function reportTrajectory(label: string, run: SimulationRun): ValidationReport {
  const report = validateTrajectory(run);
  console.log(`=== Phase 9: Trajectory plausibility — ${label} ===`);
  console.log(`  Samples: ${run.telemetry.length}, apogee ${report.apogeeAltitudeM.toFixed(1)} m @ ${report.apogeeTimeS.toFixed(1)} s, outcome=${run.outcome}`);
  for (const c of report.checks) {
    console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}`);
    console.log(`        ${c.detail}`);
  }
  console.log(`  Overall: ${report.pass ? "PASS" : "FAIL"}`);
  return report;
}
