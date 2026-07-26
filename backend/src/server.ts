import express from "express";
import cors from "cors";
import presetsRouter from "./routes/presets";
import simulateRouter from "./routes/simulate";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "ignis-backend" });
});

app.use("/api/presets", presetsRouter);
app.use("/api/simulate", simulateRouter);

app.listen(PORT, () => {
  console.log(`Ignis backend listening on http://localhost:${PORT}`);
});
