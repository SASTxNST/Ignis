import { RocketConfig } from "@ignis/physics-engine";

interface MissionControlProps {
  presets: RocketConfig[];
  selectedPresetId: string | null;
  onSelectPreset: (id: string) => void;
  onLaunch: () => void;
  isSimulating: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  frameIndex: number;
  maxFrameIndex: number;
  onScrub: (index: number) => void;
}

export default function MissionControl({
  presets,
  selectedPresetId,
  onSelectPreset,
  onLaunch,
  isSimulating,
  isPlaying,
  onTogglePlay,
  frameIndex,
  maxFrameIndex,
  onScrub,
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

      <button className="launch-button" onClick={onLaunch} disabled={!selectedPresetId || isSimulating}>
        {isSimulating ? "Simulating…" : "Launch"}
      </button>

      <div className="playback">
        <button onClick={onTogglePlay} disabled={maxFrameIndex === 0}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(maxFrameIndex, 0)}
          value={frameIndex}
          onChange={(e) => onScrub(Number(e.target.value))}
          disabled={maxFrameIndex === 0}
        />
      </div>
    </div>
  );
}
