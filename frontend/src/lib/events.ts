import { SimulationState, StageEventType } from "@ignis/physics-engine";

export const EVENT_META: Record<StageEventType, { label: string; short: string; color: string }> = {
  ignition: { label: "Ignition", short: "IGN", color: "#5aff8a" },
  burnout: { label: "Burnout", short: "BO", color: "#ffb35a" },
  separation: { label: "Separation", short: "SEP", color: "#d8b26b" },
  apogee: { label: "Apogee", short: "APO", color: "#5ac8ff" },
  impact: { label: "Impact", short: "IMP", color: "#ff5a36" },
};

/**
 * telemetry is a fixed-timestep timeline sorted by time. Given an event's
 * timestamp, find the index of the closest frame — used to scrub playback
 * to an event and to place ticks on the scrub bar. This is a lookup over
 * already-computed data, not a physics calculation.
 */
export function findFrameIndexForTime(telemetry: SimulationState[], time: number): number {
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