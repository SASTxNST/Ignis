import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import presetsRouter from "./routes/presets";
import simulateRouter from "./routes/simulate";
import { PRESETS } from "@ignis/physics-engine";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// In production, set CORS_ORIGIN to the frontend's origin (e.g.
// "https://ignis.example.com"). In development, all origins are allowed.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin, optionsSuccessStatus: 200 }
      : undefined, // allow all in dev
  ),
);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "5mb" }));

// ---------------------------------------------------------------------------
// Request logging (structured, non-verbose)
// ---------------------------------------------------------------------------
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[ignis] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ignis] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`[ignis] Backend listening on http://localhost:${PORT}`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown — drain in-flight requests before exiting
// ---------------------------------------------------------------------------
function shutdown(signal: string) {
  console.log(`[ignis] Received ${signal}, shutting down gracefully…`);
  server.close(() => {
    console.log("[ignis] All connections closed. Exiting.");
    process.exit(0);
  });
  // Force-exit if connections don't close within 10 s
  setTimeout(() => {
    console.error("[ignis] Shutdown timed out, forcing exit.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
