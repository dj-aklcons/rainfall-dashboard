"use client";
import { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";
import { fmtRel } from "@/lib/utils";
import type { Theme, DataSources } from "@/lib/types";

interface Props {
  lastUpdated: Date;
  refreshing: boolean;
  onRefresh: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  dataSources?: DataSources;
}

const NAMES: Record<string, string> = {
  central:   "Auckland Central",
  waitakere: "Waitakere",
  takapuna:  "Takapuna",
  manukau:   "Manukau",
};
const ALL_IDS = ["central", "waitakere", "takapuna", "manukau"];

function fmtSourceTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `today · ${time}`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" }) + ` · ${time}`;
}

export default function Header({ lastUpdated, refreshing, onRefresh, theme, onThemeToggle, dataSources }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showInfo) return;
    function handler(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showInfo]);

  const hasData = !!(dataSources?.cache || dataSources?.live);
  const coveredIds = new Set([
    ...(dataSources?.cache?.stationIds ?? []),
    ...(dataSources?.live?.stationIds ?? []),
  ]);
  const noDataIds = ALL_IDS.filter(id => !coveredIds.has(id));

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <Icons.dropColor />
        </div>
        <div className="brand-text">
          <strong>Auckland Rainfall</strong>
          <span>LIBRARIES · CONSERVATION MONITORING</span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", opacity: 0.5, marginLeft: 8, alignSelf: "flex-end", paddingBottom: 2 }}>v18</span>
      </div>

      <div className="topbar-right">
        {/* Tappable status pill with source detail popup */}
        <div style={{ position: "relative" }} ref={infoRef}>
          <div
            className="status-pill"
            title={hasData ? "Tap for data source details" : "Connected to hydrotel telemetry feed"}
            onClick={() => hasData && setShowInfo(v => !v)}
            style={{ cursor: hasData ? "pointer" : "default", userSelect: "none" }}
          >
            <span className={`status-dot${refreshing ? " loading" : ""}`} />
            <span style={hasData ? { textDecoration: showInfo ? "underline" : undefined } : undefined}>
              {refreshing ? "Refreshing…" : `Updated ${fmtRel(lastUpdated)}`}
            </span>
          </div>

          {showInfo && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 200,
              background: "var(--surface-card, #fff)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              lineHeight: 1.6,
              zIndex: 200,
              boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            }}>

              {dataSources?.cache && (
                <div style={{ marginBottom: (dataSources.live || noDataIds.length) ? 8 : 0 }}>
                  <div style={{ color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 2, fontSize: 10 }}>
                    CRON · {fmtSourceTime(dataSources.cache.fetchedAt)}
                  </div>
                  {dataSources.cache.stationIds.length > 0
                    ? dataSources.cache.stationIds.map(id => (
                        <div key={id} style={{ color: "var(--text-soft)", paddingLeft: 8 }}>
                          · {NAMES[id] ?? id}
                        </div>
                      ))
                    : <div style={{ color: "var(--text-muted)", paddingLeft: 8, opacity: 0.6 }}>none</div>
                  }
                </div>
              )}

              {dataSources?.live && (
                <div style={{ marginBottom: noDataIds.length ? 8 : 0 }}>
                  <div style={{ color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 2, fontSize: 10 }}>
                    LIVE · {fmtSourceTime(dataSources.live.fetchedAt)}
                  </div>
                  {dataSources.live.stationIds.map(id => (
                    <div key={id} style={{ color: "var(--text-soft)", paddingLeft: 8 }}>
                      · {NAMES[id] ?? id}
                    </div>
                  ))}
                </div>
              )}

              {noDataIds.length > 0 && (
                <div>
                  <div style={{ color: "var(--warn)", letterSpacing: "0.06em", marginBottom: 2, fontSize: 10 }}>
                    NO DATA
                  </div>
                  {noDataIds.map(id => (
                    <div key={id} style={{ color: "var(--text-muted)", paddingLeft: 8 }}>
                      · {NAMES[id] ?? id}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>

        <button className={`icon-btn${refreshing ? " spinning" : ""}`} onClick={onRefresh}
          title="Refresh data" aria-label="Refresh">
          <Icons.refresh />
        </button>
        <button className="icon-btn" onClick={onThemeToggle}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} aria-label="Toggle theme">
          {theme === "dark" ? <Icons.sun /> : <Icons.moon />}
        </button>
      </div>
    </header>
  );
}
