import { RocketConfig, SimulationRun } from "@ignis/physics-engine";

const BASE = "/api";

export async function fetchPresets(): Promise<RocketConfig[]> {
  const res = await fetch(`${BASE}/presets`);
  if (!res.ok) throw new Error(`Failed to fetch presets: ${res.status}`);
  return res.json();
}

export async function runSimulation(config: RocketConfig): Promise<SimulationRun> {
  const res = await fetch(`${BASE}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Simulation request failed: ${res.status}`);
  return res.json();
}
