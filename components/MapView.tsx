"use client";
import { useState, useMemo } from "react";
import { regionShapes } from "@/lib/region-shapes";
import { fmtMM } from "@/lib/utils";
import type { Station } from "@/lib/types";

const REGION_DISPLAY: Record<string, { label: string; cardinal: string }> = {
  takapuna:  { label: "Takapuna",         cardinal: "North Shore" },
  waitakere: { label: "Waitakere",        cardinal: "Western Ranges" },
  central:   { label: "Auckland Central", cardinal: "Isthmus" },
  manukau:   { label: "Manukau",          cardinal: "South Auckland" },
};

const ORDERED_IDS = ["waitakere", "takapuna", "central", "manukau"];

interface TileProps {
  station: Station;
  total: number;
  peak: number;
  intensity: number;
  accent: string;
  hovered: boolean;
  onHoverChange: (v: boolean) => void;
  onClick: () => void;
}

function RegionTile({ station, total, peak, intensity, accent, hovered, onHoverChange, onClick }: TileProps) {
  const shape = regionShapes[station.id];
  if (!shape) return null;
  const fill = intensity < 0.02
    ? `color-mix(in oklab, ${accent} 8%, var(--surface-2))`
    : `color-mix(in oklab, ${accent} ${Math.round(25 + intensity * 70)}%, var(--surface-2))`;
  const stroke = `color-mix(in oklab, ${accent} ${Math.round(45 + intensity * 50)}%, var(--text-soft))`;
  const display = REGION_DISPLAY[station.id];

  return (
    <button className={`region-tile${hovered ? " is-hovered" : ""}`} onClick={onClick}
      onMouseEnter={() => onHoverChange(true)} onMouseLeave={() => onHoverChange(false)}
      aria-label={`${station.name}, ${total.toFixed(1)} mm in 24 hours`}>
      <div className="region-tile-shape">
        <svg viewBox={shape.viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
          <path d={shape.d} fill={fill} stroke={stroke}
            strokeWidth={Math.max(0.8, shape.w / 500)} fillRule="evenodd"
            style={{ transition: "fill 200ms" }} />
        </svg>
      </div>
      <div className="region-tile-meta">
        <div className="region-tile-name">
          <strong>{display.label}</strong>
          <span>{display.cardinal} · {station.site}</span>
        </div>
        <div className="region-tile-num">
          <strong>{fmtMM(total)}<i>mm</i></strong>
          <span>peak {fmtMM(peak)} mm/h</span>
        </div>
      </div>
    </button>
  );
}

interface Props {
  stations: Station[];
  accent: string;
  onOpen: (id: string) => void;
}

export default function MapView({ stations, accent, onOpen }: Props) {
  const [hoverId, setHover] = useState<string | null>(null);

  const data = useMemo(() => {
    const totals: Record<string, { total: number; peak: number }> = {};
    let max = 0;
    stations.forEach((s) => {
      const last24 = s.series.slice(-24);
      const total = last24.reduce((a, b) => a + b.value, 0);
      const peak = Math.max(...last24.map((p) => p.value));
      totals[s.id] = { total, peak };
      if (total > max) max = total;
    });
    return { totals, max: Math.max(2, max) };
  }, [stations]);

  const ordered = ORDERED_IDS.map((id) => stations.find((s) => s.id === id)).filter(Boolean) as Station[];
  const allTotal = Object.values(data.totals).reduce((a, b) => a + b.total, 0);

  return (
    <section className="card map-card">
      <div className="map-head">
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, letterSpacing: "-0.01em" }}>24-hour rainfall by region</h2>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Region tinted by total mm · tap to drill in
          </div>
        </div>
        <div className="map-head-right">
          <div className="map-total">
            <span className="control-label">All regions</span>
            <strong>{fmtMM(allTotal)}<i> mm</i></strong>
          </div>
          <div className="hm-legend" aria-label="Rainfall scale">
            <span>0</span>
            <div className="gradient" />
            <span>{fmtMM(data.max)}</span>
          </div>
        </div>
      </div>

      <div className="region-grid">
        {ordered.map((s) => {
          const d = data.totals[s.id];
          const intensity = Math.min(1, d.total / data.max);
          return (
            <RegionTile key={s.id} station={s} total={d.total} peak={d.peak}
              intensity={intensity} accent={accent}
              hovered={hoverId === s.id}
              onHoverChange={(v) => setHover(v ? s.id : null)}
              onClick={() => onOpen(s.id)} />
          );
        })}
      </div>
    </section>
  );
}
