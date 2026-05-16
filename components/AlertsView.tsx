"use client";
import { useState, useMemo } from "react";
import { Icons } from "./Icons";
import { fmtMM, fmtDayHour } from "@/lib/utils";
import type { Station } from "@/lib/types";

interface Props {
  stations: Station[];
  accent: string;
}

interface AlertItem {
  id: string;
  sev: "high" | "med" | "low";
  title: string;
  desc: string;
  time: string;
  icon: keyof typeof Icons;
}

export default function AlertsView({ stations, accent: _accent }: Props) {
  const [threshold, setThreshold] = useState(25);

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    stations.forEach((station) => {
      const s24 = station.series.slice(-24);
      const total24 = s24.reduce((a, b) => a + b.value, 0);
      const peak = s24.reduce((m, p) => (p.value > m.value ? p : m), s24[0]);
      if (total24 >= threshold) {
        items.push({
          id: `${station.id}-tot`,
          sev: total24 >= threshold * 2 ? "high" : "med",
          title: `${station.name} exceeded ${threshold} mm in 24h`,
          desc: `${total24.toFixed(1)} mm accumulated. Peak intensity ${peak.value.toFixed(1)} mm/h at ${fmtDayHour(peak.timestamp)}.`,
          time: peak.timestamp,
          icon: "warn",
        });
      }
      if (peak.value >= 8) {
        items.push({
          id: `${station.id}-peak`,
          sev: peak.value >= 15 ? "high" : "med",
          title: `High intensity at ${station.name}`,
          desc: `Hourly intensity reached ${peak.value.toFixed(1)} mm/h — review for surface runoff risk.`,
          time: peak.timestamp,
          icon: "spark",
        });
      }
    });
    if (items.length === 0) {
      items.push({
        id: "calm",
        sev: "low",
        title: "No active warnings",
        desc: "All four stations report sub-threshold rainfall over the last 24 hours.",
        time: new Date().toISOString(),
        icon: "drop",
      });
    }
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [stations, threshold]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <div className="card">
        <div className="threshold-row">
          <span className="control-label">24h alert threshold</span>
          <input type="number" min="1" max="200" step="1" value={threshold}
            onChange={(e) => setThreshold(+e.target.value || 0)} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>mm</span>
          <span style={{ color: "var(--text-soft)", fontSize: 12 }}>
            · MetService heavy-rain warning starts at 50 mm/24h
          </span>
        </div>
      </div>

      {alerts.map((a) => {
        const I = Icons[a.icon] as (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
        return (
          <div key={a.id} className={`alert-card sev-${a.sev}`}>
            <div className="alert-icon"><I /></div>
            <div className="alert-body">
              <div className="alert-title">{a.title}</div>
              <div className="alert-meta">{fmtDayHour(a.time)} · severity {a.sev}</div>
              <div className="alert-desc">{a.desc}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
