"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import type { DataPoint } from "@/lib/types";
import { fmtMM, fmtDayHour } from "@/lib/utils";

interface Props {
  series: DataPoint[];
  height?: number;
  accent: string;
  mode?: "hourly" | "cumulative";
  range?: string;
}

function niceMax(m: number) {
  if (m < 1) return 1;
  if (m < 5) return Math.ceil(m);
  if (m < 50) return Math.ceil(m / 5) * 5;
  return Math.ceil(m / 10) * 10;
}

function dayLabel(ts: string, range: string) {
  const d = new Date(ts);
  if (range === "7d") {
    const wd = d.toLocaleDateString("en-NZ", { weekday: "short" });
    return `${wd} ${d.getDate()}`;
  }
  const mo = d.toLocaleDateString("en-NZ", { month: "short" });
  return `${d.getDate()} ${mo}`;
}

export default function LineChart({ series, height = 280, accent, mode = "hourly", range }: Props) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number; value: number; timestamp: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [renderedW, setRenderedW] = useState(600);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRenderedW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = 800, H = height, padL = 36, padR = 14, padT = 16, padB = 28;

  const data = useMemo(() => {
    if (mode === "cumulative") {
      let acc = 0;
      return series.map((p) => ({ ...p, value: (acc += p.value) }));
    }
    return series;
  }, [series, mode]);

  const max = useMemo(() => niceMax(Math.max(0.5, ...data.map((d) => d.value))), [data]);

  const n = data.length;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const svgStep = innerW / Math.max(1, n - 1);

  const points = data.map((d, i) => [padL + i * svgStep, padT + innerH - (d.value / max) * innerH] as [number, number]);
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const last = points[points.length - 1];
  const area = `${path} L${last[0]},${padT + innerH} L${padL},${padT + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + innerH * (1 - f),
    label: f === 0 ? "0" : fmtMM(max * f),
  }));

  const xTicks = useMemo(() => {
    const isMultiDay = range === "7d" || range === "30d";

    if (isMultiDay) {
      // Find indices where the calendar day changes
      const boundaries: number[] = n > 0 ? [0] : [];
      for (let i = 1; i < n; i++) {
        const prev = new Date(data[i - 1].timestamp).toDateString();
        const curr = new Date(data[i].timestamp).toDateString();
        if (prev !== curr) boundaries.push(i);
      }

      // Decide how many labels fit in the rendered width.
      // Use ~48 screen-px minimum spacing between label centres.
      const maxLabels = Math.max(2, Math.floor(renderedW / 48));
      const stride = Math.max(1, Math.ceil(boundaries.length / maxLabels));

      return boundaries
        .filter((_, idx) => idx % stride === 0)
        .map((i) => {
          const d = data[i];
          if (!d) return null;
          return { i, label: dayLabel(d.timestamp, range), px: padL + i * svgStep };
        })
        .filter(Boolean) as { i: number; label: string; px: number }[];
    }

    // Time labels for 24h / 48h
    const tickCount = Math.min(8, Math.max(4, Math.floor(n / 8)));
    return Array.from({ length: tickCount }, (_, k) => {
      const i = Math.round((k / (tickCount - 1)) * (n - 1));
      const d = data[i];
      if (!d) return null;
      const label = new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return { i, label, px: padL + i * svgStep };
    }).filter(Boolean) as { i: number; label: string; px: number }[];
  }, [range, n, data, renderedW, padL, svgStep]);

  function onMove(clientX: number, rect: DOMRect) {
    const x = ((clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round((x - padL) / svgStep)));
    const d = data[i];
    if (!d) return;
    setHover({ i, px: padL + i * svgStep, py: padT + innerH - (d.value / max) * innerH, ...d });
  }

  return (
    <div ref={wrapRef} className="chart-wrap" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "auto" }}
        onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={t.y} y2={t.y}
              stroke="var(--border)" strokeWidth="1"
              strokeDasharray={i === 0 ? "0" : "2 3"} />
            <text x={padL - 6} y={t.y + 3} fontSize="10" fill="var(--text-soft)"
              fontFamily="var(--font-mono)" textAnchor="end">{t.label}</text>
          </g>
        ))}

        <path d={area} fill={accent} opacity="0.1" />
        <path d={path} fill="none" stroke={accent} strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" />

        {xTicks.map((t, i) => (
          <text key={i} x={t.px} y={H - 8} fontSize="10" fill="var(--text-soft)"
            fontFamily="var(--font-mono)" textAnchor="middle">{t.label}</text>
        ))}

        {hover && (
          <>
            <line x1={hover.px} x2={hover.px} y1={padT} y2={padT + innerH}
              stroke="var(--text)" strokeOpacity="0.25" strokeWidth="1" />
            <circle cx={hover.px} cy={hover.py} r="4"
              fill="var(--surface)" stroke={accent} strokeWidth="2" />
          </>
        )}
      </svg>

      {hover && (
        <div className="chart-tooltip" style={{ left: `${(hover.px / W) * 100}%`, top: `${(hover.py / H) * 100}%` }}>
          <div><b>{fmtMM(hover.value)} mm</b>{mode === "cumulative" ? " total" : "/h"}</div>
          <div className="chart-tooltip-time">{fmtDayHour(hover.timestamp)}</div>
        </div>
      )}
    </div>
  );
}
