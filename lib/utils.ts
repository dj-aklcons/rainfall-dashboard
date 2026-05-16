import type { DataPoint } from "./types";

export function fmtMM(n: number): string {
  if (n === 0) return "0";
  if (n < 0.1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return n.toFixed(0);
}

export function fmtDayHour(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function fmtRel(d: Date | null): string {
  if (!d) return "—";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 5) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function hoursForRange(range: string): number {
  return ({ "24h": 24, "7d": 168, "30d": 720 } as Record<string, number>)[range] ?? 24;
}

export function calcStats(series: DataPoint[]) {
  if (!series.length) return { total: 0, peak: series[0] ?? null, wetHours: 0, maxIntensity: 0 };
  const total = series.reduce((s, p) => s + p.value, 0);
  const peak = series.reduce((m, p) => (p.value > m.value ? p : m), series[0]);
  const wetHours = series.filter((p) => p.value >= 0.2).length;
  return { total, peak, wetHours, maxIntensity: peak.value };
}

export function severityFor(total: number, range: string): "high" | "med" | "low" | null {
  const norm = range === "24h" ? total : range === "7d" ? total / 3 : total / 8;
  if (norm >= 50) return "high";
  if (norm >= 25) return "med";
  if (norm >= 10) return "low";
  return null;
}
