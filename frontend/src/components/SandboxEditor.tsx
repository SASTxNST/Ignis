import { RocketConfig, SimulationRun, StageConfig } from "@ignis/physics-engine";
import InfoTooltip from "./InfoTooltip";
import { EDUCATION_COPY } from "../lib/education";

/**
 * Fields the sandbox editor can mutate on a stage.
 *
 * "peakThrustKN" is a derived pseudo-field: it reads the peak value from the
 * stage's thrustCurve and, on change, scales the entire curve proportionally so
 * the shape is preserved while the peak moves to the new value. This lets users
 * tweak thrust without understanding the raw curve format.
 *
 * All other fields are direct StageConfig keys.
 */
export type EditableStageField =
  | "peakThrustKN"     // pseudo — derived from thrustCurve, scales curve on write
  | "ispVacuum"        // StageConfig.ispVacuum  (s)
  | "dryMassKg"        // StageConfig.dryMassKg  (kg)
  | "propellantMassKg"; // StageConfig.propellantMassKg (kg)

/** Returns the peak thrust in kN from a stage's thrustCurve. */
export function peakThrustKNFromStage(stage: StageConfig): number {
  if (stage.thrustCurve.length === 0) return 0;
  return Math.max(...stage.thrustCurve.map((p) => p.thrust)) / 1000;
}

const EDITABLE_FIELDS: {
  key: EditableStageField;
  label: string;
  unit: string;
  min: number;
}[] = [
  { key: "peakThrustKN",     label: "Peak Thrust",  unit: "kN", min: 0.01 },
  { key: "ispVacuum",        label: "Isp (vacuum)", unit: "s",  min: 1 },
  { key: "dryMassKg",        label: "Dry mass",     unit: "kg", min: 0 },
  { key: "propellantMassKg", label: "Propellant",   unit: "kg", min: 0 },
];

/** Reads the displayable value for a given editable field from a stage. */
function getFieldValue(stage: StageConfig, key: EditableStageField): number {
  if (key === "peakThrustKN") return peakThrustKNFromStage(stage);
  return stage[key];
}

interface SandboxEditorProps {
  draft: RocketConfig | null;
  run: SimulationRun | null;
  onFieldChange: (stageIndex: number, field: EditableStageField, value: number) => void;
  onReset: () => void;
}

export default function SandboxEditor({ draft, run, onFieldChange, onReset }: SandboxEditorProps) {
  if (!draft) return null;

  // Stale indicator: show a warning when the draft differs from the last simulated config
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
                  value={getFieldValue(stage, key)}
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
            {isStale && (
              <span className="delta-v-note">Edited since last launch — relaunch to update</span>
            )}
          </>
        ) : (
          <span className="delta-v-note">Launch to see the Δv budget</span>
        )}
      </div>
    </div>
  );
}