"use client";
import { Icons } from "./Icons";
import { fmtRel } from "@/lib/utils";
import type { Theme } from "@/lib/types";

interface Props {
  lastUpdated: Date;
  refreshing: boolean;
  onRefresh: () => void;
  theme: Theme;
  onThemeToggle: () => void;
}

export default function Header({ lastUpdated, refreshing, onRefresh, theme, onThemeToggle }: Props) {
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
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", opacity: 0.5, marginLeft: 8, alignSelf: "flex-end", paddingBottom: 2 }}>v10</span>
      </div>
      <div className="topbar-right">
        <div className="status-pill" title="Connected to hydrotel telemetry feed">
          <span className={`status-dot${refreshing ? " loading" : ""}`} />
          <span>{refreshing ? "Refreshing…" : `Updated ${fmtRel(lastUpdated)}`}</span>
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
