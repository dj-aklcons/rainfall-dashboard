"use client";
import { useState, useMemo } from "react";
import type { DataPoint } from "@/lib/types";
import { fmtMM, fmtDayHour } from "@/lib/utils";

interface Props {
  series: DataPoint[];
  height?: number;
  accent: string;
  mode?: "hourly" | "cumulative";
  compact?: boolean;
}

function niceMax(m: number) {
  if (m < 1) return 1;
  if (m < 2) return 2;
  if (m < 5) return Math.ceil(m);
  if (m < 10) return Math.ceil(m / 2) * 2;
  if (m < 50) return Math.ceil(m / 5) * 5;
  return Math.ceil(m / 10) * 10;
}

export default function BarChart({ series, height = 110, accent, mode = "hourly", compact = false }: Props) {
  const [hover, setHover] = useState<{ i: number; x: number; value: number; timestamp: string } | null>(null);

  const W = 320, H = height, padX = 4;
  const padY = compact ? 8 : 12;
  const bottomAxis = compact ? 14 : 18;
  const innerH = H - padY - bottomAxis;

  // No-data state — render a diagonal-striped fill instead of bars
  if (series.length === 0) {
    const patId = `nodata-${height}`;
    return (
      <div className="chart-wrap" style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "auto" }}>
          <defs>
            <pattern id={patId} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45 0 0)">
              <rect width="10" height="10" fill="transparent" />
              <line x1="0" y1="0" x2="0" y2="10" stroke="var(--border)" strokeWidth="3" />
            </pattern>
          </defs>
          <line x1={padX} x2={W - padX} y1={padY + innerH} y2={padY + innerH}
            stroke="var(--border)" strokeWidth="1" />
          <rect x={padX} y={padY} width={W - padX * 2} height={innerH}
            fill={`url(#${patId})`} opacity={0.6} rx="2" />
          <text x={W / 2} y={padY + innerH / 2 + 4} textAnchor="middle"
            fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)"
            style={{ userSelect: "none" }}>
            no data
          </text>
        </svg>
      </div>
    );
  }

  const data = useMemo(() => {
    if (mode === "cumulative") {
      let acc = 0;
      return series.map((p) => ({ ...p, value: (acc += p.value) }));
    }
    return series;
  }, [series, mode]);

  const max = useMemo(() => niceMax(Math.max(0.5, ...data.map((d) => d.value))), [data]);

  const n = data.length;
  const innerW = W - padX * 2;
  const barW = Math.max(1, innerW / n - 1.5);
  const step = innerW / n;
  const gridY = [0, 0.5, 1].map((f) => padY + innerH * (1 - f));

  const xTicks = useMemo(() => {
    if (n === 0) return [];
    const first = new Date(data[0].timestamp);
    const last = new Date(data[n - 1].timestamp);
    const spanHours = (last.getTime() - first.getTime()) / 36e5;
    const maxLabels = compact ? 4 : 5;
    const fmtHour = (d: Date) => d.getHours().toString().padStart(2, "0") + ":00";
    const fmtDay = (d: Date) => d.toLocaleDateString([], { weekday: "short" });
    const fmtDate = (d: Date) => d.toLocaleDateString([], { day: "numeric", month: "short" });

    let candidates: { i: number; label: string }[] = [];
    if (spanHours <= 36) {
      for (let i = 0; i < n; i++) {
        const d = new Date(data[i].timestamp);
        if (d.getHours() % 6 === 0 && d.getMinutes() === 0) candidates.push({ i, label: fmtHour(d) });
      }
    } else if (spanHours <= 240) {
      for (let i = 0; i < n; i++) {
        const d = new Date(data[i].timestamp);
        if (d.getHours() === 0) candidates.push({ i, label: fmtDay(d) });
      }
    } else {
      for (let i = 0; i < n; i++) {
        const d = new Date(data[i].timestamp);
        if (d.getHours() === 0) candidates.push({ i, label: fmtDate(d) });
      }
    }
    if (candidates.length > maxLabels) {
      const stride = Math.ceil(candidates.length / maxLabels);
      candidates = candidates.filter((_, k) => k % stride === 0);
    }
    return candidates;
  }, [data, n, compact]);

  function onMove(clientX: number, rect: DOMRect) {
    const x = ((clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.floor((x - padX) / step)));
    setHover({ i, x: ((padX + (i + 0.5) * step) / W) * 100, ...data[i] });
  }

  return (
    <div className="chart-wrap" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "auto" }}
        onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect()); }}
        onTouchEnd={() => setHover(null)}
      >
        {gridY.map((y, i) => (
          <line key={i} x1={padX} x2={W - padX} y1={y} y2={y}
            stroke="var(--border)" strokeWidth="1"
            strokeDasharray={i === gridY.length - 1 ? "0" : "2 3"} />
        ))}
        <text x={padX + 2} y={padY - 2} fontSize="9" fill="var(--text-soft)" fontFamily="var(--font-mono)">{max} mm</text>

        {data.map((d, i) => {
          const v = Math.max(0, d.value);
          const h = (v / max) * innerH;
          const x = padX + i * step + (step - barW) / 2;
          const y = padY + innerH - h;
          const isHover = hover?.i === i;
          return (
            <rect key={i} x={x} y={y} width={barW} height={Math.max(h, v > 0 ? 1 : 0)}
              rx={Math.min(1.5, barW / 2)} fill={accent}
              opacity={hover ? (isHover ? 1 : 0.55) : v === 0 ? 0.08 : 0.95}
              style={{ transition: "opacity 120ms" }} />
          );
        })}

        {xTicks.map((t) => (
          <text key={t.i} x={padX + (t.i + 0.5) * step} y={H - 4} fontSize="9"
            fill="var(--text-soft)" fontFamily="var(--font-mono)" textAnchor="middle">
            {t.label}
          </text>
        ))}

        {hover && (
          <line x1={padX + (hover.i + 0.5) * step} x2={padX + (hover.i + 0.5) * step}
            y1={padY} y2={padY + innerH} stroke="var(--text)" strokeOpacity="0.25" strokeWidth="1" />
        )}
      </svg>

      {hover && (
        <div className="chart-tooltip" style={{ left: `${hover.x}%`, top: 0 }}>
          <div><b>{fmtMM(hover.value)} mm</b>{mode === "cumulative" ? " total" : "/h"}</div>
          <div className="chart-tooltip-time">{fmtDayHour(hover.timestamp)}</div>
        </div>
      )}
    </div>
  );
}
