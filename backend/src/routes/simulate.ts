import { Router } from "express";
import { simulate, PRESETS, RocketConfig } from "@ignis/physics-engine";
import { validateRocketConfig } from "../validator";
import { saveSimulationRun, getSimulationRun, getSimulationHistorySummary } from "../storage";

const router = Router();

// GET /api/simulate/history — list recent simulation runs
router.get("/history", (_req, res) => {
  res.json(getSimulationHistorySummary());
});

// GET /api/simulate/:runId — retrieve a previously saved simulation run
router.get("/:runId", (req, res) => {
  const stored = getSimulationRun(req.params.runId);
  if (!stored) {
    res.status(404).json({ error: `Simulation run not found for id "${req.params.runId}"` });
    return;
  }
  res.json({
    runId: stored.runId,
    createdAt: stored.createdAt,
    ...stored.run,
  });
});

// POST /api/simulate — body: RocketConfig -> returns a full SimulationRun with runId
router.post("/", (req, res) => {
  const config = req.body as RocketConfig;

  const validationErrors = validateRocketConfig(config);
  if (validationErrors.length > 0) {
    res.status(400).json({
      error: "Invalid rocket configuration.",
      details: validationErrors,
    });
    return;
  }

  try {
    const run = simulate(config);
    const stored = saveSimulationRun(run);
    res.json({
      runId: stored.runId,
      createdAt: stored.createdAt,
      ...run,
    });
  } catch (err) {
    res.status(500).json({ error: "Simulation failed", details: (err as Error).message });
  }
});

// POST /api/simulate/preset/:id — run simulation directly for a preset ID
router.post("/preset/:id", (req, res) => {
  const preset = PRESETS[req.params.id];
  if (!preset) {
    res.status(404).json({ error: `No preset found with id "${req.params.id}"` });
    return;
  }

  try {
    const run = simulate(preset);
    const stored = saveSimulationRun(run);
    res.json({
      runId: stored.runId,
      createdAt: stored.createdAt,
      ...run,
    });
  } catch (err) {
    res.status(500).json({ error: "Preset simulation failed", details: (err as Error).message });
  }
});

// POST /api/simulate/compare — compare multiple rocket configurations or preset IDs
router.post("/compare", (req, res) => {
  const { configs, presetIds } = req.body as { configs?: RocketConfig[]; presetIds?: string[] };

  const targets: RocketConfig[] = [];

  if (Array.isArray(presetIds)) {
    for (const id of presetIds) {
      if (PRESETS[id]) {
        targets.push(PRESETS[id]);
      }
    }
  }

  if (Array.isArray(configs)) {
    for (const config of configs) {
      if (validateRocketConfig(config).length === 0) {
        targets.push(config);
      }
    }
  }

  if (targets.length === 0) {
    res.status(400).json({
      error: "No valid rocket configurations or preset IDs provided for comparison.",
    });
    return;
  }

  try {
    const comparisons = targets.map((config) => {
      const run = simulate(config);
      const lastEvent = run.events[run.events.length - 1];
      return {
        id: config.id,
        name: config.name,
        payloadMassKg: config.payloadMassKg,
        stagesCount: config.stages.length,
        outcome: run.outcome,
        maxAltitudeM: run.maxAltitudeM,
        maxVelocityMs: run.maxVelocityMs,
        totalDeltaVMs: run.totalDeltaVMs,
        flightDurationS: lastEvent ? lastEvent.time : 0,
      };
    });

    res.json({ comparisons });
  } catch (err) {
    res.status(500).json({ error: "Comparison failed", details: (err as Error).message });
  }
});

export default router;
