import { RocketState, StageEventType } from "@ignis/physics-engine";

/**
 * Display metadata for each flight event type emitted by the physics engine.
 * All StageEventType values must be represented here — missing keys cause a
 * runtime crash when the launch log or chart reference-line renderer hits an
 * event the engine emitted but the map doesn't know about.
 */
export const EVENT_META: Record<StageEventType, { label: string; short: string; color: string }> = {
  ignition:   { label: "Ignition",   short: "IGN", color: "#5aff8a" },
  burnout:    { label: "Burnout",    short: "BO",  color: "#ffb35a" },
  separation: { label: "Separation", short: "SEP", color: "#d8b26b" },
  apogee:     { label: "Apogee",     short: "APO", color: "#5ac8ff" },
  maxq:       { label: "Max-Q",      short: "MXQ", color: "#c084fc" },
  transonic:  { label: "Transonic",  short: "TRN", color: "#f87171" },
  impact:     { label: "Impact",     short: "IMP", color: "#ff5a36" },
};

/**
 * Returns the index of the telemetry frame closest in time to the given
 * mission elapsed time. Used to seek the playback scrubber to an event.
 */
export function findFrameIndexForTime(telemetry: RocketState[], time: number): number {
  if (telemetry.length === 0) return 0;
  let closest = 0;
  let closestDiff = Math.abs(telemetry[0].time - time);
  for (let i = 1; i < telemetry.length; i++) {
    const diff = Math.abs(telemetry[i].time - time);
    if (diff < closestDiff) {
      closest = i;
      closestDiff = diff;
    }
  }
  return closest;
}