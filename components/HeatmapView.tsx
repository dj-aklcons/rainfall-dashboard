"use client";
import HeatmapRow from "./charts/HeatmapRow";
import type { Station, Range } from "@/lib/types";

interface Props {
  stations: Station[];
  accent: string;
  range: Range;
}

export default function HeatmapView({ stations, accent, range }: Props) {
  const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Hour-of-day intensity</h2>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Average mm/h by hour, last {days} day{days > 1 ? "s" : ""}
          </div>
        </div>
        <div className="hm-legend">
          <span>0</span>
          <div className="gradient" />
          <span>peak</span>
        </div>
      </div>
      <div className="heatmap-wrap">
        <div className="heatmap">
          <div className="hm-label" />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="hm-axis">{h.toString().padStart(2, "0")}</div>
          ))}
          {stations.map((s) => (
            <HeatmapRow key={s.id} station={s} days={days} accent={accent} />
          ))}
        </div>
      </div>
    </section>
  );
}
