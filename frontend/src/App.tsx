import { useEffect, useRef, useState } from "react";
import { RocketConfig, SimulationRun } from "@ignis/physics-engine";
import { fetchPresets, runSimulation, describeApiError, FriendlyError } from "./lib/api";
import RocketScene from "./three/RocketScene";
import TelemetryDashboard from "./components/TelemetryDashboard";
import MissionControl from "./components/MissionControl";
import ErrorBanner from "./components/ErrorBanner";
import Countdown from "./components/Countdown";
import { EditableStageField } from "./components/SandboxEditor";

// Advance through telemetry frames faster than real-time, since real burns
// and coasts run into the tens of minutes — this is a playback speed, not a
// physics parameter, so it never touches the simulation itself.
const PLAYBACK_FRAMES_PER_SECOND = 30;

export default function App() {
  const [presets, setPresets] = useState<RocketConfig[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<RocketConfig | null>(null);
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const playbackRef = useRef<number | null>(null);

  useEffect(() => {
    fetchPresets()
      .then(setPresets)
      .catch((err) => setError(describeApiError(err)));
  }, []);

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
    }, 1000 / PLAYBACK_FRAMES_PER_SECOND);
    return () => {
      if (playbackRef.current) window.clearInterval(playbackRef.current);
    };
  }, [isPlaying, run]);

  // Selecting a vehicle resets the sandbox draft to a fresh clone of that
  // preset. structuredClone (not spread/assign) so nested `stages` objects
  // are independent copies too — editing draft.stages[i].thrustKN must never
  // touch presets[i], since that array is also what repopulates the draft
  // on "Reset to preset".
  function handleSelectPreset(id: string) {
    setSelectedPresetId(id);
    const preset = presets.find((p) => p.id === id);
    setDraftConfig(preset ? structuredClone(preset) : null);
    setError(null);
    setIsCountingDown(false);
    setIsPlaying(false);
  }

  function handleStageFieldChange(stageIndex: number, field: EditableStageField, value: number) {
    setDraftConfig((prev) => {
      if (!prev) return prev;
      const stages = prev.stages.map((stage, i) => (i === stageIndex ? { ...stage, [field]: value } : stage));
      return { ...prev, stages };
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
      // Don't start playback yet — the countdown overlay owns that transition.
      // handleCountdownComplete flips isPlaying once it finishes (or is skipped).
      setIsCountingDown(true);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setIsSimulating(false);
    }
  }

  function handleCountdownComplete() {
    setIsCountingDown(false);
    setIsPlaying(true);
  }

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