"use client";
import HeatmapRow from "./charts/HeatmapRow";
import type { Station, Range } from "@/lib/types";

interface Props {
  stations: Station[];
  accent: string;
  range: Range;
}

function axisLabels(range: Range): string[] {
  if (range === "24h") {
    return Array.from({ length: 24 }, (_, h) =>
      h % 6 === 0 ? h.toString().padStart(2, "0") : ""
    );
  }
  if (range === "48h") {
    // 48 columns — label every 12 hours
    return Array.from({ length: 48 }, (_, h) =>
      h % 12 === 0 ? `${h}h` : ""
    );
  }
  if (range === "7d") {
    // 28 columns — 4 × 6 h buckets per day; label the first bucket of each day
    const now = new Date();
    return Array.from({ length: 28 }, (_, i) => {
      if (i % 4 !== 0) return "";
      const d = new Date(now.getTime() - (6 - i / 4) * 86_400_000);
      return d.toLocaleDateString("en-NZ", { weekday: "short" }).slice(0, 2);
    });
  }
  // 30d — 30 columns, one per day; label every 5th + last
  return Array.from({ length: 30 }, (_, i) =>
    i % 5 === 0 || i === 29 ? String(i + 1) : ""
  );
}

const CONFIG: Record<Range, { cols: number; days: number; subtitle: string }> = {
  "24h": { cols: 24, days: 1,  subtitle: "Hourly intensity — last 24 hours" },
  "48h": { cols: 48, days: 2,  subtitle: "Hourly intensity — last 48 hours" },
  "7d":  { cols: 28, days: 7,  subtitle: "6-hour totals — last 7 days" },
  "30d": { cols: 30, days: 30, subtitle: "Daily totals — last 30 days" },
};

export default function HeatmapView({ stations, accent, range }: Props) {
  const { cols, days, subtitle } = CONFIG[range];
  const labels = axisLabels(range);

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Rainfall intensity</h2>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {subtitle}
          </div>
        </div>
        <div className="hm-legend">
          <span>0</span>
          <div className="gradient" />
          <span>peak</span>
        </div>
      </div>
      <div className="heatmap-wrap">
        <div
          className="heatmap"
          style={{ gridTemplateColumns: `110px repeat(${cols}, 1fr)` }}
        >
          <div className="hm-label" />
          {labels.map((label, i) => (
            <div key={i} className="hm-axis">{label}</div>
          ))}
          {stations.map((s) => (
            <HeatmapRow key={s.id} station={s} days={days} cols={cols} accent={accent} />
          ))}
        </div>
      </div>
    </section>
  );
}
