# Integration Notes — @ignis/physics-engine

Breaking changes introduced by the rebuilt physics engine (Phases 1–11). This
document is for the backend and frontend teams updating their imports. The
engine's public API is `simulateRocket()` + `validateRocket()` — see
`README.md` in this folder for the full API reference.

## Package import path

```ts
import { simulateRocket, validateRocket, PRESETS } from "@ignis/physics-engine";
```

- All lowercase: `@ignis/physics-engine`. (One frontend file currently uses
  `@Ignis/physics-engine` — capital `I` — which does not resolve.)
- The package must be **built first**: run `npm run build` in
  `physics-engine/` before type-checking or running backend/frontend, because
  `main`/`types` point at `dist/`.

## Type & field renames (old → new)

| Old (v0.1.0) | New | Notes |
|---|---|---|
| `Stage` | `StageConfig` | Type name only; shape also changed — see below. |
| `SimulationState` | `RocketState` | Telemetry element type (`SimulationRun.telemetry: RocketState[]`). |
| `stage.thrustKN: number` | `stage.thrustCurve: ThrustCurvePoint[]` | Thrust is now a time series `[{ time, thrust }, …]` in **Newtons**, seconds since stage ignition. Must span `[0, burnTime]`. |
| `stage.ispSeconds: number` | `stage.ispSeaLevel` + `stage.ispVacuum` | Single Isp split into two values (seconds). Both required; thrust is blended between them by ambient pressure. |
| `config.crossSectionalAreaM2` | `config.referenceAreaM2` | Rename only (still m²). |
| `config.dragCoefficient: number` | `config.dragCoefficientCurve: DragCoefficientPoint[]` | Scalar Cd replaced by a Mach table `[{ mach, cd }, …]` (must include the transonic rise around Mach 1). |
| `frame.thrustKN` (telemetry) | `frame.thrustMagnitude` | Telemetry thrust is in **Newtons**; divide by 1000 if displaying kN. |
| `simulate(config)` | `simulateRocket(config, options?)` | `simulate` remains as a `@deprecated` alias for now; new code should call `simulateRocket` (validates first, throws `RocketConfigError` with field-level detail). |
| backend `validateRocketConfig()` | engine `validateRocket(config): ValidationResult` | Config validation now lives in the engine. Returns `{ valid, errors: [{ field, message }] }`. The backend's local validator can be deleted/delegated. |

## New required config fields (no old equivalent)

`RocketConfig` now also requires (all SI units):

- `launchAngleDeg` — launch angle from vertical, 0 = straight up.
- `gravityTurnStartAltitudeM` — altitude where pitch-over begins (m).
- `gravityTurnRateDegS` — pitch-over rate (deg/s).
- `payloadMassKg` — unchanged, still required.

See any preset in `physics-engine/src/presets/` (e.g. `vikram1.ts`) for a
complete, valid example config.

## Simulation events — now include `maxq` and `transonic`

`StageEventType` is now: `ignition | burnout | separation | apogee | maxq | transonic | impact`.

Every `StageEvent` carries `{ type, time, stageIndex, altitude }`:

- **`maxq`** — moment of maximum dynamic pressure. `time`/`altitude` locate it;
  `stageIndex` is `-1` (not stage-specific). The corresponding pressure value
  is on `SimulationRun.maxQ` (Pa).
- **`transonic`** — first crossing of Mach 1 during ascent. `time`/`altitude`
  locate it; `stageIndex` is `-1`. Peak Mach is on `SimulationRun.maxMach`.

Code that exhaustively maps events (e.g. a
`Record<StageEventType, …>` like the frontend's `EVENT_META`) must add
`maxq` and `transonic` entries or it will no longer compile.

## Other behaviour notes

- `SimulationRun` gained headline metrics: `apogeeAltitudeM`, `apogeeTime`,
  `maxQ`, `maxMach`, `totalDeltaVMs`, `impactTime`, `impactVelocityMs`.
- The final telemetry sample of a suborbital run sits slightly below ground —
  that is the physical impact-overshoot from event detection, not a bug.
- `simulateRocket` is deterministic: same config + options → same output.
