import { Router } from "express";
import { simulate, RocketConfig } from "@ignis/physics-engine";

const router = Router();

// POST /api/simulate — body: RocketConfig (either a preset, edited via sandbox
// mode, or a fully custom design) -> returns a full SimulationRun.
//
// Kept as a thin wrapper: all real logic lives in the physics engine so this
// endpoint stays trivial to extend later (e.g. persisting runs for a
// multiplayer challenge, or replaying a saved run by id).
router.post("/", (req, res) => {
  const config = req.body as RocketConfig;

  if (!config || !Array.isArray(config.stages) || config.stages.length === 0) {
    res.status(400).json({ error: "Request body must be a RocketConfig with at least one stage." });
    return;
  }

  try {
    const run = simulate(config);
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: "Simulation failed", details: (err as Error).message });
  }
});

export default router;
