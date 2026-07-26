import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SimulationState } from "@ignis/physics-engine";

interface TelemetryDashboardProps {
  telemetry: SimulationState[];
  frameIndex: number;
}

function Readout({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="readout">
      <div className="readout-label">{label}</div>
      <div className="readout-value">
        {value} <span className="readout-unit">{unit}</span>
      </div>
    </div>
  );
}

export default function TelemetryDashboard({ telemetry, frameIndex }: TelemetryDashboardProps) {
  const frame = telemetry[frameIndex];
  const chartData = telemetry.map((f) => ({
    time: Math.round(f.time),
    altitudeKm: f.position.y / 1000,
    velocityMs: Math.hypot(f.velocity.x, f.velocity.y),
  }));

  if (!frame) return <div className="telemetry-dashboard">No telemetry yet — run a simulation.</div>;

  const speed = Math.hypot(frame.velocity.x, frame.velocity.y);
  const fuelPct =
    telemetry[0]?.fuelRemainingKg && frame.fuelRemainingKg != null
      ? ((frame.fuelRemainingKg / (telemetry[0].fuelRemainingKg || 1)) * 100).toFixed(0)
      : "—";

  return (
    <div className="telemetry-dashboard">
      <div className="readout-grid">
        <Readout label="Altitude" value={(frame.position.y / 1000).toFixed(2)} unit="km" />
        <Readout label="Velocity" value={speed.toFixed(0)} unit="m/s" />
        <Readout label="Thrust" value={frame.thrustKN.toFixed(1)} unit="kN" />
        <Readout label="Fuel (active stage)" value={fuelPct} unit="%" />
        <Readout label="Active stage" value={String(frame.activeStageIndex + 1)} unit="" />
        <Readout label="Mission time" value={frame.time.toFixed(1)} unit="s" />
      </div>

      <div className="chart-block">
        <div className="chart-title">Altitude</div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#26314a" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#7d8aa8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#7d8aa8" />
            <Tooltip contentStyle={{ background: "#141a26", border: "1px solid #26314a" }} />
            <Line type="monotone" dataKey="altitudeKm" stroke="#ff5a36" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-block">
        <div className="chart-title">Velocity</div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#26314a" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#7d8aa8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#7d8aa8" />
            <Tooltip contentStyle={{ background: "#141a26", border: "1px solid #26314a" }} />
            <Line type="monotone" dataKey="velocityMs" stroke="#5ac8ff" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
