import { Router } from "express";
import { PRESETS, theoreticalDeltaV } from "@ignis/physics-engine";

const router = Router();

// GET /api/presets — list all available rocket configs with metadata
router.get("/", (_req, res) => {
  const presetsList = Object.values(PRESETS).map((config) => ({
    ...config,
    theoreticalDeltaVMs: Math.round(theoreticalDeltaV(config)),
  }));
  res.json(presetsList);
});

// GET /api/presets/:id — fetch one config by id
router.get("/:id", (req, res) => {
  const preset = PRESETS[req.params.id];
  if (!preset) {
    res.status(404).json({ error: `No preset found with id "${req.params.id}"` });
    return;
  }
  res.json({
    ...preset,
    theoreticalDeltaVMs: Math.round(theoreticalDeltaV(preset)),
  });
});

export default router;
