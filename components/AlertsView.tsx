"use client";
import { useState, useMemo, useEffect } from "react";
import { Icons } from "./Icons";
import { fmtMM, fmtDayHour } from "@/lib/utils";
import type { Station } from "@/lib/types";

interface Props {
  stations: Station[];
  accent: string;
  showAI: boolean;
}

interface AlertItem {
  id: string;
  sev: "high" | "med" | "low";
  title: string;
  desc: string;
  time: string;
  icon: keyof typeof Icons;
}

export default function AlertsView({ stations, accent: _accent, showAI }: Props) {
  const [threshold, setThreshold] = useState(25);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  async function generateSummary() {
    setAiLoading(true);
    try {
      const facts = stations.map((s) => {
        const last24 = s.series.slice(-24);
        return {
          name: s.name,
          site: s.site,
          total_24h_mm: +last24.reduce((a, b) => a + b.value, 0).toFixed(1),
          peak_mm_per_h: +Math.max(...last24.map((p) => p.value)).toFixed(1),
          wet_hours: last24.filter((p) => p.value >= 0.2).length,
        };
      });
      const prompt = `You are a hydrology analyst writing a 1-paragraph (~60 words) plain-English briefing for an Auckland Council conservation team. Summarise the past 24 hours of rainfall from these four stations. Mention which area is wettest and any operational concerns. Do not use bullet points or headers. Be concise and factual.\n\nData (JSON):\n${JSON.stringify(facts)}`;
      const res = await fetch("/api/ai-briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const json = await res.json() as { text?: string; error?: string };
      setAiText(json.text?.trim() ?? json.error ?? "Summary unavailable.");
    } catch {
      setAiText("Summary unavailable — check connection.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (showAI && !aiText) generateSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAI]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      {showAI && (
        <div className="ai-summary">
          <div className="icon"><Icons.spark /></div>
          <div className="body">
            <div className="label">Conservation briefing · AI</div>
            <div className="text">
              {aiLoading ? "Generating briefing…" : aiText ?? "Click 'Regenerate' to produce a 24-hour summary."}
            </div>
            {!aiLoading && (
              <button className="filter-pill" style={{ alignSelf: "flex-start", marginTop: 4 }}
                onClick={generateSummary}>Regenerate</button>
            )}
          </div>
        </div>
      )}

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
