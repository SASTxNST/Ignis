import { useEffect, useRef, useState } from "react";
import { RocketConfig, SimulationRun } from "@ignis/physics-engine";
import { fetchPresets, runSimulation } from "./lib/api";
import RocketScene from "./three/RocketScene";
import TelemetryDashboard from "./components/TelemetryDashboard";
import MissionControl from "./components/MissionControl";

// Advance through telemetry frames faster than real-time, since real burns
// and coasts run into the tens of minutes — this is a playback speed, not a
// physics parameter, so it never touches the simulation itself.
const PLAYBACK_FRAMES_PER_SECOND = 30;

export default function App() {
  const [presets, setPresets] = useState<RocketConfig[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackRef = useRef<number | null>(null);

  useEffect(() => {
    fetchPresets()
      .then(setPresets)
      .catch((err) => console.error("Failed to load presets — is the backend running on :4000?", err));
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

  async function handleLaunch() {
    const config = presets.find((p) => p.id === selectedPresetId);
    if (!config) return;
    setIsSimulating(true);
    setIsPlaying(false);
    try {
      const result = await runSimulation(config);
      setRun(result);
      setFrameIndex(0);
      setIsPlaying(true);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-title">IGNIS</span>
        <span className="app-subtitle">Rocket Launch Simulation Platform</span>
      </header>

      <div className="app-body">
        <MissionControl
          presets={presets}
          selectedPresetId={selectedPresetId}
          onSelectPreset={setSelectedPresetId}
          onLaunch={handleLaunch}
          isSimulating={isSimulating}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          frameIndex={frameIndex}
          maxFrameIndex={run ? run.telemetry.length - 1 : 0}
          onScrub={setFrameIndex}
        />

        <div className="scene-panel">
          <RocketScene telemetry={run?.telemetry ?? []} frameIndex={frameIndex} />
        </div>

        <TelemetryDashboard telemetry={run?.telemetry ?? []} frameIndex={frameIndex} />
      </div>
    </div>
  );
}
