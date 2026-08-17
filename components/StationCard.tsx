"use client";
import BarChart from "./charts/BarChart";
import { calcStats, severityFor, hoursForRange, fmtMM } from "@/lib/utils";
import type { Station, Range, Unit } from "@/lib/types";

interface Props {
  station: Station;
  range: Range;
  unit: Unit;
  accent: string;
  onOpen: (id: string) => void;
}

export default function StationCard({ station, range, unit, accent, onOpen }: Props) {
  const hours = hoursForRange(range);
  const series = station.series.slice(-hours);
  const s = calcStats(series);
  const sev = severityFor(s.total, range);
  const unavailable = station.dataUnavailable === true;

  return (
    <article className="card clickable" onClick={() => onOpen(station.id)}
      role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(station.id)}>
      <div className="station-card-head">
        <div>
          <h3 className="station-name">{station.name}</h3>
          <div className="station-site">{station.site}</div>
        </div>
        {unavailable
          ? <span className="station-badge" style={{
              background: "var(--warn, #c0392b)", color: "#fff",
              letterSpacing: "0.06em",
            }}>NO DATA</span>
          : sev === "high" ? <span className="station-badge alert">Heavy</span>
          : sev === "med" ? <span className="station-badge wet">Wet</span>
          : s.total > 0.5 ? <span className="station-badge wet">Active</span>
          : <span className="station-badge">Quiet</span>}
      </div>

      <div className="metric-row">
        {unavailable ? (
          <div style={{ opacity: 0.4, fontFamily: "var(--font-mono)", fontSize: 13 }}>
            Telemetry unavailable
          </div>
        ) : (
          <>
            <div>
              <span className="metric-big">{fmtMM(s.total)}</span>
              <span className="metric-unit">mm total · {range}</span>
            </div>
            <div className="metric-sub">
              peak <strong>{fmtMM(s.maxIntensity)} mm/h</strong><br />
              <span>{s.wetHours} of {hours}h wet</span>
            </div>
          </>
        )}
      </div>

      <BarChart series={series} accent={accent}
        mode={unit === "total" ? "cumulative" : "hourly"}
        height={range === "24h" ? 110 : 90} />

      <div className="chart-foot">
        <span>ts_id {station.ts_id}</span>
        <span>tap to drill in →</span>
      </div>
    </article>
  );
}
