"use client";
import type { Station } from "@/lib/types";
import { fmtMM } from "@/lib/utils";

interface Props {
  station: Station;
  days: number;
  accent: string;
}

export default function HeatmapRow({ station, days, accent }: Props) {
  const series = station.series.slice(-days * 24);
  const max = Math.max(0.5, ...series.map((p) => p.value));

  const hourAverages = Array.from({ length: 24 }, (_, hour) => {
    let sum = 0, count = 0;
    for (let d = 0; d < days; d++) {
      const p = series[d * 24 + hour];
      if (p) { sum += p.value; count++; }
    }
    return count ? sum / count : 0;
  });

  return (
    <>
      <div className="hm-label">{station.name}</div>
      {hourAverages.map((v, hour) => {
        const intensity = Math.min(1, v / max);
        const bg = intensity < 0.02
          ? "var(--surface-2)"
          : `color-mix(in oklab, ${accent} ${Math.round(20 + intensity * 80)}%, var(--surface-2))`;
        return (
          <div key={hour} className="hm-cell" style={{ background: bg }}
            title={`${hour.toString().padStart(2, "0")}:00 — ${fmtMM(v)} mm/h avg`} />
        );
      })}
    </>
  );
}
