# @ignis/physics-engine

Pure TypeScript rocket flight-simulation core for the Ignis platform. No UI, no networking — a single deterministic function from a validated `RocketConfig` to a complete `SimulationRun`.

The engine models a 3DOF planar point-mass trajectory (downrange + altitude) with thrust curves, altitude-dependent specific impulse, Mach-dependent drag, an ISA layered atmosphere, and inverse-square gravity, integrated with an adaptive RK45 (Dormand–Prince) solver. It is validated to the 0.0597% error budget on apogee altitude (see `runValidationSuite()` for the full report, including the inverse-square energy-conservation reference used for that proof).

## What this module does

- Simulates full rocket flights: powered ascent through all stages (with jettison), unpowered coast, apogee, descent, and ground impact.
- Emits time-series telemetry: position, velocity, mass, per-force vectors, dynamic pressure, and Mach number at each accepted solver step.
- Emits discrete events: ignition, burnout, separation, transonic, max-Q, apogee, and impact.
- Classifies the outcome as `"orbit" | "suborbital" | "failure"`.

## Public API

You only need two functions. Everything else (equations of motion, ODE solver, atmosphere, drag, guidance internals) is deliberately not exported.

### `simulateRocket(config, options?): SimulationRun`

Runs the full simulation. Validates the config first; throws `RocketConfigError` (with a field-level list of exactly what is wrong) instead of silently producing bad physics.

```ts
function simulateRocket(
  config: RocketConfig,
  options?: Partial<SimulationOptions>,
): SimulationRun
```

- **`config`** — the vehicle to fly. All fields required, in SI units (m, kg, s, N).
- **`options`** — optional solver/output overrides (`solverRelativeTolerance`, `maxTimeS`, `telemetryRecordStride`, …). Defaults are tuned and validation-tested; most callers pass nothing.
- **Returns** — a `SimulationRun`: `telemetry: RocketState[]`, `events: StageEvent[]`, and headline metrics (`apogeeAltitudeM`, `apogeeTime`, `maxAltitudeM`, `maxVelocityMs`, `maxQ`, `maxMach`, `totalDeltaVMs`, `impactTime`, `impactVelocityMs`, `outcome`).

### `validateRocket(config): ValidationResult`

Standalone pre-flight check. Use it to gate user input (sandbox editor, HTTP body, JSON import) before calling `simulateRocket`, or to surface clear field-level errors to a user.

```ts
function validateRocket(config: unknown): ValidationResult

interface ValidationResult {
  valid: boolean;
  errors: ConfigValidationError[]; // { field: string; message: string }
}
```

Catches, among other things: missing/empty thrust curves, thrust curves shorter than `burnTime`, zero or negative dry mass, negative burn times, non-positive Isp, empty stage list, missing drag-coefficient curve, and out-of-range launch angles.

### Supporting exports

| Export | Kind | Purpose |
|---|---|---|
| `theoreticalDeltaV(config)` | function | Ideal Tsiolkovsky stage-by-stage Δv (vacuum Isp, no losses). |
| `validateTrajectory(run)` | function | Phase 9 shape check (monotone ascent, single apogee, monotone descent, no negative altitude, no oscillation). |
| `PRESETS` | const | Built-in, validated vehicles (`"vikram-1"`, `"lvm3"`, `"falcon-9"`, `"pslv-xl"`, `"sslv"`). |
| `RocketConfigError` | class | Error thrown by `simulateRocket` on an invalid config. |
| `DEFAULT_SIMULATION_OPTIONS` | const | The default solver/output settings. |

Types exported: `RocketConfig`, `StageConfig`, `ThrustCurvePoint`, `DragCoefficientPoint`, `PropulsionType`, `SimulationOptions`, `SimulationRun`, `RocketState`, `StageEvent`, `StageEventType`, `SimulationOutcome`, `Vector2`, `ConfigValidationError`, `ValidationResult`, `ValidationReport`.

## Usage

```ts
import {
  simulateRocket,
  validateRocket,
  theoreticalDeltaV,
  PRESETS,
  RocketConfigError,
} from "@ignis/physics-engine";
import type { RocketConfig, SimulationRun } from "@ignis/physics-engine";

// 1. From a preset
const run = simulateRocket(PRESETS["vikram-1"]);
console.log(run.outcome, run.apogeeAltitudeM, run.apogeeTime);

// 2. From your own config — validate first so you get a clean error
const myRocket: RocketConfig = /* ...build or parse... */;
const check = validateRocket(myRocket);
if (!check.valid) {
  for (const e of check.errors) console.error(`${e.field}: ${e.message}`);
} else {
  const result = simulateRocket(myRocket);
}
```

## Notes for integrators

- `simulateRocket` is deterministic: same config + same options → same result.
- The first sample(s) of `telemetry` are at liftoff; the final sample sits a fraction below ground — that is the physical impact-overshoot produced by the impact-event search, not a bug. `validateTrajectory` knows how to handle it.
- The package must be built (`npm run build` inside `physics-engine/`) before backend/frontend `tsc` can resolve `@ignis/physics-engine` (it points at `dist/`).
- For internal development/verification only, `npm run validate` (from this folder) runs `runValidationSuite()`, which reports the full Phase 7–9 error-budget and plausibility results. It is not part of the runtime API.
