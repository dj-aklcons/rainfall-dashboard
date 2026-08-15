"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import ControlsBar from "@/components/ControlsBar";
import DashboardView from "@/components/DashboardView";
import DrillView from "@/components/DrillView";
import HeatmapView from "@/components/HeatmapView";
import AlertsView from "@/components/AlertsView";
import MapView from "@/components/MapView";
import type { View, Range, Unit, Theme, Density, AccentPreset, Station } from "@/lib/types";

/* Te Penapena accent presets */
const ACCENT_PRESETS: AccentPreset[] = [
  { light: "#124E4A", dark: "#52C0AA", name: "Deep Teal" },
  { light: "#52C0AA", dark: "#7dd4c4", name: "Light Teal" },
  { light: "#14A68B", dark: "#3ecbaa", name: "Success" },
  { light: "#4576BB", dark: "#6a95d0", name: "Blue" },
  { light: "#A03022", dark: "#d4574a", name: "Critical" },
  { light: "#C95032", dark: "#e07050", name: "Warning" },
];

function getLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v !== null ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function setLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("24h");
  const [unit, setUnit] = useState<Unit>("rate");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filter, setFilter] = useState(["central", "waitakere", "takapuna", "manukau"]);

  const [stations, setStations] = useState<Station[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccent] = useState("#124E4A");
  const [density, setDensity] = useState<Density>("comfy");

  // Load persisted preferences on mount
  useEffect(() => {
    setTheme(getLS<Theme>("theme", "light"));
    setAccent(getLS<string>("accent", "#124E4A"));
    setDensity(getLS<Density>("density", "comfy"));
  }, []);

  // Apply theme/density/accent to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = theme;
    html.dataset.density = density;
    const preset = ACCENT_PRESETS.find((p) => p.light === accent) ?? ACCENT_PRESETS[0];
    const resolvedAccent = theme === "dark" ? preset.dark : preset.light;
    html.style.setProperty("--accent", resolvedAccent);
    html.style.setProperty("--accent-soft", resolvedAccent + "1f");
    setLS("theme", theme);
    setLS("accent", accent);
    setLS("density", density);
  }, [theme, accent, density]);

  const accentHex = useMemo(() => {
    const preset = ACCENT_PRESETS.find((p) => p.light === accent) ?? ACCENT_PRESETS[0];
    return theme === "dark" ? preset.dark : preset.light;
  }, [accent, theme]);

  const fetchRainfallData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/rainfall");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { stations: Station[]; isMockData: boolean; errors?: string[] };
      setStations(json.stations);
      setIsMockData(json.isMockData);
      setApiErrors(json.errors ?? []);
      setLastUpdated(new Date());
    } catch {
      // API unreachable or Vercel function timed out — load mock data client-side
      // so the dashboard always has something to display.
      const { buildMockStations } = await import("@/lib/data");
      setStations(buildMockStations());
      setIsMockData(true);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
      setDataLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => { fetchRainfallData(); }, [fetchRainfallData]);

  function toggleFilter(id: string) {
    setFilter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  function handleView(v: View) {
    setView(v);
    setOpenedId(null);
  }

  const openedStation = useMemo(() => stations.find((s) => s.id === openedId), [openedId, stations]);

  if (dataLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--surface-sidebar)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        color: "rgba(255,255,255,0.8)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        letterSpacing: "0.04em",
      }}>
        <svg width="48" height="48" viewBox="0 0 345.13 345.13" fill="none" style={{ opacity: 0.9 }}>
          <path fill="#76CDCE" d="M264.25,301.7c-2.45,3.01-5.08,5.91-7.88,8.71c-23.14,23.14-53.47,34.72-83.8,34.72s-60.66-11.58-83.81-34.72c-22.86-22.86-34.71-53.2-34.71-83.84c0-21.31,5.74-42.77,17.5-61.94l21.16-34.48L172.57,0l31.67,51.62l24.28,39.56l45.06,73.45C300.18,207.99,295.971,263.03,264.25,301.7z"/>
          <path fill="#96E0DE" d="M264.25,301.7L92.71,130.15L172.57,0l31.67,51.62l24.28,39.56l45.06,73.45C300.18,207.99,295.971,263.03,264.25,301.7z"/>
        </svg>
        LOADING TELEMETRY…
      </div>
    );
  }

  return (
    <div className="app">
      <Header lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={fetchRainfallData}
        theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />

      {isMockData && (
        <div style={{
          background: "color-mix(in oklab, var(--warn) 12%, transparent)",
          border: "1px solid var(--warn)",
          color: "var(--warn)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          padding: "8px 14px",
          marginBottom: "var(--gap)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontWeight: 600 }}>DEMO DATA</span>
          · Live KiWIS telemetry unavailable — showing simulated rainfall data
          {apiErrors.length > 0 && (
            <span style={{ opacity: 0.7, marginLeft: 8 }}>
              ({apiErrors.join(" | ")})
            </span>
          )}
        </div>
      )}

      {!openedStation && (
        <ControlsBar view={view} onView={handleView} range={range} onRange={setRange}
          unit={unit} onUnit={setUnit} stations={stations} filter={filter} onFilter={toggleFilter}
          showLocations={view === "dashboard"} hideRangeControls={view === "map"} />
      )}

      {openedStation ? (
        <DrillView station={openedStation} range={range} unit={unit} accent={accentHex}
          onBack={() => setOpenedId(null)} onRange={setRange} />
      ) : view === "dashboard" ? (
        <DashboardView stations={stations} range={range} unit={unit} accent={accentHex}
          filter={filter} onOpen={setOpenedId} />
      ) : view === "map" ? (
        <MapView stations={stations} accent={accentHex} onOpen={setOpenedId} />
      ) : view === "heatmap" ? (
        <HeatmapView stations={stations} accent={accentHex} range={range} />
      ) : (
        <AlertsView stations={stations} accent={accentHex} />
      )}

      {/* Accent & density strip */}
      <div style={{ position: "fixed", bottom: 16, right: 16, display: "flex", gap: 8, alignItems: "center", zIndex: 50 }}>
        {ACCENT_PRESETS.map((p) => (
          <button key={p.light} onClick={() => setAccent(p.light)} title={p.name}
            style={{
              width: 18, height: 18, borderRadius: "50%",
              background: theme === "dark" ? p.dark : p.light,
              border: accent === p.light ? "2px solid var(--text)" : "2px solid transparent",
              cursor: "pointer", flexShrink: 0,
            }} />
        ))}
        <button className="icon-btn" style={{ fontSize: 11, width: "auto", padding: "0 10px", fontFamily: "var(--font-mono)" }}
          onClick={() => setDensity(density === "comfy" ? "compact" : "comfy")} title="Toggle density">
          {density === "comfy" ? "compact" : "comfy"}
        </button>
      </div>
    </div>
  );
}
