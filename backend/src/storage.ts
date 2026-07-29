import { SimulationRun } from "@ignis/physics-engine";
import { randomUUID } from "node:crypto";

export interface StoredSimulationRun {
  runId: string;
  createdAt: string;
  run: SimulationRun;
}

const MAX_HISTORY_SIZE = 50;
const runsStore = new Map<string, StoredSimulationRun>();
const historyList: string[] = [];

export function saveSimulationRun(run: SimulationRun): StoredSimulationRun {
  const runId = `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const stored: StoredSimulationRun = {
    runId,
    createdAt: new Date().toISOString(),
    run,
  };

  runsStore.set(runId, stored);
  historyList.unshift(runId);

  if (historyList.length > MAX_HISTORY_SIZE) {
    const removedId = historyList.pop();
    if (removedId) {
      runsStore.delete(removedId);
    }
  }

  return stored;
}

export function getSimulationRun(runId: string): StoredSimulationRun | undefined {
  return runsStore.get(runId);
}

export function getSimulationHistorySummary() {
  return historyList.map((runId) => {
    const stored = runsStore.get(runId)!;
    return {
      runId: stored.runId,
      createdAt: stored.createdAt,
      rocketId: stored.run.config.id,
      rocketName: stored.run.config.name,
      outcome: stored.run.outcome,
      maxAltitudeM: stored.run.maxAltitudeM,
      maxVelocityMs: stored.run.maxVelocityMs,
      totalDeltaVMs: stored.run.totalDeltaVMs,
    };
  });
}
