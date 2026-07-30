import { RocketConfig, SimulationRun } from "@ignis/physics-engine";
import SandboxEditor, { EditableStageField } from "./SandboxEditor";
import { EVENT_META, findFrameIndexForTime } from "../lib/events";

interface MissionControlProps {
  presets: RocketConfig[];
  selectedPresetId: string | null;
  onSelectPreset: (id: string) => void;
  onLaunch: () => void;
  isSimulating: boolean;
  isCountingDown: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  frameIndex: number;
  maxFrameIndex: number;
  onScrub: (index: number) => void;
  draftConfig: RocketConfig | null;
  run: SimulationRun | null;
  onStageFieldChange: (stageIndex: number, field: EditableStageField, value: number) => void;
  onResetSandbox: () => void;
}

export default function MissionControl({
  presets,
  selectedPresetId,
  onSelectPreset,
  onLaunch,
  isSimulating,
  isCountingDown,
  isPlaying,
  onTogglePlay,
  frameIndex,
  maxFrameIndex,
  onScrub,
  draftConfig,
  run,
  onStageFieldChange,
  onResetSandbox,
}: MissionControlProps) {
  return (
    <div className="mission-control">
      <h2>Mission Control</h2>

      <label className="field">
        <span>Vehicle</span>
        <select
          value={selectedPresetId ?? ""}
          onChange={(e) => onSelectPreset(e.target.value)}
        >
          <option value="" disabled>
            Select a vehicle
          </option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <SandboxEditor
        draft={draftConfig}
        run={run}
        onFieldChange={onStageFieldChange}
        onReset={onResetSandbox}
      />

      <button
        className="launch-button"
        onClick={onLaunch}
        disabled={!draftConfig || isSimulating || isCountingDown}
      >
        {isSimulating ? "Simulating…" : isCountingDown ? "Countdown…" : "Launch"}
      </button>

      <div className="playback">
        <button onClick={onTogglePlay} disabled={maxFrameIndex === 0 || isCountingDown}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="scrub-track">
          <input
            type="range"
            min={0}
            max={Math.max(maxFrameIndex, 0)}
            value={frameIndex}
            onChange={(e) => onScrub(Number(e.target.value))}
            disabled={maxFrameIndex === 0 || isCountingDown}
          />
          {run && maxFrameIndex > 0 && (
            <div className="scrub-ticks">
              {run.events.map((event, i) => {
                const eventFrame = findFrameIndexForTime(run.telemetry, event.time);
                const pct = (eventFrame / maxFrameIndex) * 100;
                const meta = EVENT_META[event.type];
                return (
                  <span
                    key={`${event.type}-${event.stageIndex}-${i}`}
                    className="scrub-tick"
                    style={{ left: `${pct}%`, background: meta.color }}
                    title={`${meta.label} — T+${event.time.toFixed(1)}s`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}