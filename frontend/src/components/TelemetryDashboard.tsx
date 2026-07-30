import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { SimulationState, StageEvent } from "@ignis/physics-engine";
import { EVENT_META, findFrameIndexForTime } from "../lib/events";
import InfoTooltip from "./InfoTooltip";
import { EDUCATION_COPY } from "../lib/education";

interface TelemetryDashboardProps {
  telemetry: SimulationState[];
  frameIndex: number;
  events: StageEvent[];
  onSelectEvent: (frameIndex: number) => void;
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

// One <ReferenceLine> per event, shared between both charts. Kept as a
// component instead of inline JSX so the same markers stay in sync across
// the altitude and velocity charts.
function EventMarkers({ events }: { events: StageEvent[] }) {
  return (
    <>
      {events.map((event, i) => {
        const meta = EVENT_META[event.type];
        return (
          <ReferenceLine
            key={`${event.type}-${event.stageIndex}-${i}`}
            x={Math.round(event.time)}
            stroke={meta.color}
            strokeDasharray="3 3"
            label={{ value: meta.short, position: "top", fill: meta.color, fontSize: 9 }}
          />
        );
      })}
    </>
  );
}

export default function TelemetryDashboard({ telemetry, frameIndex, events, onSelectEvent }: TelemetryDashboardProps) {
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
        <div className="chart-title">
          Altitude <InfoTooltip {...EDUCATION_COPY.gravityTurn} />
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#26314a" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#7d8aa8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#7d8aa8" />
            <Tooltip contentStyle={{ background: "#141a26", border: "1px solid #26314a" }} />
            <Line type="monotone" dataKey="altitudeKm" stroke="#ff5a36" dot={false} strokeWidth={2} />
            <EventMarkers events={events} />
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
            <EventMarkers events={events} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {events.length > 0 && (
        <div className="launch-log">
          <div className="chart-title">Launch Log</div>
          <ul className="launch-log-list">
            {events.map((event, i) => {
              const meta = EVENT_META[event.type];
              return (
                <li key={`${event.type}-${event.stageIndex}-${i}`}>
                  <button
                    className="launch-log-item"
                    onClick={() => onSelectEvent(findFrameIndexForTime(telemetry, event.time))}
                    type="button"
                  >
                    <span className="launch-log-dot" style={{ background: meta.color }} />
                    <span className="launch-log-text">
                      Stage {event.stageIndex + 1} — {meta.label}
                    </span>
                    <span className="launch-log-time">T+{event.time.toFixed(1)}s</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}