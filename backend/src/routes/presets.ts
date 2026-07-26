import { Router } from "express";
import { PRESETS } from "@ignis/physics-engine";

const router = Router();

// GET /api/presets — list all available rocket configs (Vikram-1, LVM3, ...)
router.get("/", (_req, res) => {
  res.json(Object.values(PRESETS));
});

// GET /api/presets/:id — fetch one config by id
router.get("/:id", (req, res) => {
  const preset = PRESETS[req.params.id];
  if (!preset) {
    res.status(404).json({ error: `No preset found with id "${req.params.id}"` });
    return;
  }
  res.json(preset);
});

export default router;
