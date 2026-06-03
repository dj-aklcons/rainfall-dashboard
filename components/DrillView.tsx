"use client";
import { useMemo } from "react";
import { Icons } from "./Icons";
import LineChart from "./charts/LineChart";
import { calcStats, hoursForRange, fmtMM, fmtDayHour } from "@/lib/utils";
import type { Station, Range, Unit } from "@/lib/types";

interface Props {
  station: Station;
  range: Range;
  unit: Unit;
  accent: string;
  onBack: () => void;
  onRange: (r: Range) => void;
}

const RANGES: Range[] = ["24h", "48h", "7d", "30d"];

function windowTotal(series: Station["series"], hours: number) {
  return series.slice(-hours).reduce((a, b) => a + b.value, 0);
}

export default function DrillView({ station, range, unit, accent, onBack, onRange }: Props) {
  const hours = hoursForRange(range);
  const series = station.series.slice(-hours);
  const s = calcStats(series);

  const dryStretch = useMemo(() => {
    let max = 0, cur = 0;
    for (const p of series) {
      if (p.value < 0.05) { cur++; if (cur > max) max = cur; } else cur = 0;
    }
    return max;
  }, [series]);

  const recent24 = station.series.slice(-24);
  const prev24   = station.series.slice(-48, -24);
  const trend    = recent24.reduce((a, b) => a + b.value, 0) - prev24.reduce((a, b) => a + b.value, 0);

  const flagged = series.filter((p) => p.quality !== 1).length;

  const t1  = windowTotal(station.series, 1);
  const t6  = windowTotal(station.series, 6);
  const t12 = windowTotal(station.series, 12);
  const t24 = windowTotal(station.series, 24);
  const t48 = windowTotal(station.series, 48);

  const lastPoint  = station.series[station.series.length - 1];
  const sensorTime = lastPoint
    ? new Date(lastPoint.timestamp).toLocaleDateString("en-NZ", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <section>
      {/* Back + range selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <button className="back-btn" style={{ marginBottom: 0 }} onClick={onBack}>
          <Icons.back /> All stations
        </button>
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => onRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="drill">
        <div className="drill-main">
          <div className="card" style={{ gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 22, letterSpacing: "-0.02em" }}>{station.name}</h2>
                <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
                  {station.site} · {station.lat.toFixed(4)}°, {station.lng.toFixed(4)}° · {station.elevation} m
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div>
                  <span className="metric-big">{fmtMM(s.total)}</span>
                  <span className="metric-unit">mm · {range}</span>
                </div>
                <div className="metric-sub" style={{ marginTop: 6 }}>
                  vs prior 24h{" "}
                  <strong style={{ color: trend > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                    {trend > 0 ? "+" : ""}{fmtMM(trend)} mm
                  </strong>
                </div>
              </div>
            </div>
            <LineChart series={series} accent={accent} mode={unit === "total" ? "cumulative" : "hourly"} height={300} />
          </div>
        </div>

        <div className="drill-side">
          {/* Rainfall totals card */}
          <div className="card">
            <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
              {station.site} · Rainfall Totals
            </div>
            <div style={{ marginBottom: 14 }}>
              <span className="metric-big">{fmtMM(t48)}</span>
              <span className="metric-unit" style={{ marginLeft: 4 }}>mm</span>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 3 }}>
                Last 48 hours
              </div>
            </div>
            <div className="stat-grid" style={{ marginBottom: 12 }}>
              {([["Last 1 hr", t1], ["Last 6 hrs", t6], ["Last 12 hrs", t12], ["Last 24 hrs", t24]] as [string, number][]).map(([label, val]) => (
                <div key={label} className="stat">
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{fmtMM(val)}<span className="u">mm</span></div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              Sensor data to {sensorTime}
            </div>
          </div>

          {/* Stats grid */}
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Peak intensity</div>
              <div className="stat-value">{fmtMM(s.maxIntensity)}<span className="u">mm/h</span></div>
            </div>
            <div className="stat">
              <div className="stat-label">Wet hours</div>
              <div className="stat-value">{s.wetHours}<span className="u">/ {hours}</span></div>
            </div>
            <div className="stat">
              <div className="stat-label">Longest dry</div>
              <div className="stat-value">{dryStretch}<span className="u">h</span></div>
            </div>
            <div className="stat">
              <div className="stat-label">Peak at</div>
              <div className="stat-value" style={{ fontSize: 14 }}>
                {s.peak ? fmtDayHour(s.peak.timestamp) : "—"}
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="section-title">Station metadata</h4>
            <div className="meta-list">
              <div className="row"><span>Site code</span><strong>{station.id.toUpperCase()}</strong></div>
              <div className="row"><span>ts_id</span><strong>{station.ts_id}</strong></div>
              <div className="row"><span>Parameter</span><strong>Rainfall.HOURTOT</strong></div>
              <div className="row"><span>Elevation</span><strong>{station.elevation} m</strong></div>
              <div className="row"><span>Timezone</span><strong>Pacific/Auckland</strong></div>
              <div className="row"><span>Data source</span><strong>hydrotel · KiWIS</strong></div>
            </div>
          </div>

          <div className="card">
            <h4 className="section-title">Quality flags</h4>
            <div className="meta-list">
              <div className="row"><span>Good (QC 1)</span><strong>{series.length - flagged}</strong></div>
              <div className="row"><span>Suspect (QC 200)</span><strong>{flagged}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
