import { RocketConfig, SimulationRun } from "@ignis/physics-engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPresets, runSimulation, describeApiError, FriendlyError } from "./lib/api";
import RocketScene from "./three/RocketScene";
import TelemetryDashboard from "./components/TelemetryDashboard";
import MissionControl from "./components/MissionControl";
import ErrorBanner from "./components/ErrorBanner";
import Countdown from "./components/Countdown";
import { EditableStageField, peakThrustKNFromStage } from "./components/SandboxEditor";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYBACK_FPS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Applies a sandbox field edit to a RocketConfig stage.
 *
 * Direct fields (ispVacuum, dryMassKg, propellantMassKg) are applied with a
 * simple spread. The `peakThrustKN` pseudo-field scales the entire thrust
 * curve proportionally so the shape is preserved while the peak moves to the
 * new value.
 */
function applyStageFieldChange(
  config: RocketConfig,
  stageIndex: number,
  field: EditableStageField,
  value: number,
): RocketConfig {
  const stages = config.stages.map((stage, i) => {
    if (i !== stageIndex) return stage;

    if (field === "peakThrustKN") {
      const currentPeakN = peakThrustKNFromStage(stage) * 1000;
      const newPeakN = value * 1000;
      // Avoid division by zero if the curve is all-zero
      const ratio = currentPeakN > 0 ? newPeakN / currentPeakN : 1;
      return {
        ...stage,
        thrustCurve: stage.thrustCurve.map((pt) => ({
          ...pt,
          thrust: pt.thrust * ratio,
        })),
      };
    }

    return { ...stage, [field]: value };
  });

  return { ...config, stages };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  // --- Presets ---
  const [presets, setPresets] = useState<RocketConfig[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<RocketConfig | null>(null);

  // --- Simulation ---
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);

  // --- Playback ---
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const playbackRef = useRef<number | null>(null);

  // ── Load presets on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchPresets()
      .then(setPresets)
      .catch((err) => setError(describeApiError(err)));
  }, []);

  // ── Playback interval ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !run) return;
    playbackRef.current = window.setInterval(() => {
      setFrameIndex((i) => {
        if (i >= run.telemetry.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1000 / PLAYBACK_FPS);
    return () => {
      if (playbackRef.current) window.clearInterval(playbackRef.current);
    };
  }, [isPlaying, run]);

  // ── Handlers ──────────────────────────────────────────────────────────

  function handleSelectPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    setSelectedPresetId(id);
    setDraftConfig(preset ? structuredClone(preset) : null);
    setError(null);
    setIsCountingDown(false);
    setIsPlaying(false);
  }

  function handleStageFieldChange(
    stageIndex: number,
    field: EditableStageField,
    value: number,
  ) {
    setDraftConfig((prev) => {
      if (!prev) return prev;
      return applyStageFieldChange(prev, stageIndex, field, value);
    });
  }

  function handleResetSandbox() {
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (preset) setDraftConfig(structuredClone(preset));
  }

  async function handleLaunch() {
    if (!draftConfig) return;
    setIsSimulating(true);
    setIsPlaying(false);
    setError(null);
    try {
      const result = await runSimulation(draftConfig);
      setRun(result);
      setFrameIndex(0);
      setIsCountingDown(true);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setIsSimulating(false);
    }
  }

  const handleCountdownComplete = useCallback(() => {
    setIsCountingDown(false);
    setIsPlaying(true);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-title">IGNIS</span>
        <span className="app-subtitle">Rocket Launch Simulation Platform</span>
      </header>

      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      <div className="app-body">
        <MissionControl
          presets={presets}
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
          onLaunch={handleLaunch}
          isSimulating={isSimulating}
          isCountingDown={isCountingDown}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          frameIndex={frameIndex}
          maxFrameIndex={run ? run.telemetry.length - 1 : 0}
          onScrub={setFrameIndex}
          draftConfig={draftConfig}
          run={run}
          onStageFieldChange={handleStageFieldChange}
          onResetSandbox={handleResetSandbox}
        />

        <div className="scene-panel">
          {isCountingDown && <Countdown onComplete={handleCountdownComplete} />}
          <RocketScene telemetry={run?.telemetry ?? []} frameIndex={frameIndex} />
        </div>

        <TelemetryDashboard
          telemetry={run?.telemetry ?? []}
          frameIndex={frameIndex}
          events={run?.events ?? []}
          onSelectEvent={setFrameIndex}
        />
      </div>
    </div>
  );
}