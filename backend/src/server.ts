import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import presetsRouter from "./routes/presets";
import simulateRouter from "./routes/simulate";
import { PRESETS } from "@ignis/physics-engine";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// GET /api/health — status & diagnostics
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "ignis-backend",
    uptimeSeconds: Math.floor(process.uptime()),
    presetsAvailable: Object.keys(PRESETS),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/presets", presetsRouter);
app.use("/api/simulate", simulateRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Ignis backend listening on http://localhost:${PORT}`);
});
