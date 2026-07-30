import { RocketConfig, SimulationRun } from "@ignis/physics-engine";
import InfoTooltip from "./InfoTooltip";
import { EDUCATION_COPY } from "../lib/education";

export type EditableStageField = "thrustKN" | "ispSeconds" | "dryMassKg" | "propellantMassKg";

const EDITABLE_FIELDS: { key: EditableStageField; label: string; unit: string; min: number }[] = [
  { key: "thrustKN", label: "Thrust", unit: "kN", min: 0.01 },
  { key: "ispSeconds", label: "Isp", unit: "s", min: 0.01 },
  { key: "dryMassKg", label: "Dry mass", unit: "kg", min: 0 },
  { key: "propellantMassKg", label: "Propellant", unit: "kg", min: 0 },
];

interface SandboxEditorProps {
  draft: RocketConfig | null;
  run: SimulationRun | null;
  onFieldChange: (stageIndex: number, field: EditableStageField, value: number) => void;
  onReset: () => void;
}

export default function SandboxEditor({ draft, run, onFieldChange, onReset }: SandboxEditorProps) {
  if (!draft) return null;

  // The backend is the only thing that knows Δv — this just decides whether
  // the *last computed* value still describes the config on screen, by
  // comparing to the config that was actually sent for that run.
  const isStale = run ? JSON.stringify(run.config) !== JSON.stringify(draft) : false;

  return (
    <div className="sandbox-editor">
      <div className="sandbox-header">
        <h2>
          Sandbox <InfoTooltip {...EDUCATION_COPY.staging} />
        </h2>
        <button className="reset-button" onClick={onReset} type="button">
          Reset to preset
        </button>
      </div>

      {draft.stages.map((stage, stageIndex) => (
        <fieldset className="stage-editor" key={stageIndex}>
          <legend>{stage.name}</legend>
          <div className="stage-editor-grid">
            {EDITABLE_FIELDS.map(({ key, label, unit, min }) => (
              <label className="stage-editor-field" key={key}>
                <span>
                  {label} <span className="stage-editor-unit">({unit})</span>
                </span>
                <input
                  type="number"
                  min={min}
                  step="any"
                  value={stage[key]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (Number.isFinite(value)) onFieldChange(stageIndex, key, value);
                  }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className={`delta-v-panel${isStale ? " delta-v-stale" : ""}`}>
        <span className="delta-v-label">
          Δv budget <InfoTooltip {...EDUCATION_COPY.deltaV} />
        </span>
        {run ? (
          <>
            <span className="delta-v-value">{Math.round(run.totalDeltaVMs).toLocaleString()} m/s</span>
            {isStale && <span className="delta-v-note">Edited since last launch — relaunch to update</span>}
          </>
        ) : (
          <span className="delta-v-note">Launch to see the Δv budget</span>
        )}
      </div>
    </div>
  );
}