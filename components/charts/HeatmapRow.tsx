"use client";
import type { Station } from "@/lib/types";
import { fmtMM } from "@/lib/utils";

interface Props {
  station: Station;
  days: number;
  cols: number;
  accent: string;
}

export default function HeatmapRow({ station, days, cols, accent }: Props) {
  const totalHours = days * 24;
  const series = station.series.slice(-totalHours);
  const bucketSize = totalHours / cols; // 1 h, 6 h, or 24 h

  const buckets = Array.from({ length: cols }, (_, c) => {
    const start = Math.floor(c * bucketSize);
    const end = Math.floor((c + 1) * bucketSize);
    return series.slice(start, end).reduce((sum, p) => sum + p.value, 0);
  });

  const max = Math.max(0.5, ...buckets);

  return (
    <>
      <div className="hm-label">{station.name}</div>
      {buckets.map((v, c) => {
        const intensity = Math.min(1, v / max);
        const bg =
          intensity < 0.02
            ? "var(--surface-2)"
            : `color-mix(in oklab, ${accent} ${Math.round(20 + intensity * 80)}%, var(--surface-2))`;
        return (
          <div
            key={c}
            className="hm-cell"
            style={{ background: bg }}
            title={`${fmtMM(v)} mm`}
          />
        );
      })}
    </>
  );
}
