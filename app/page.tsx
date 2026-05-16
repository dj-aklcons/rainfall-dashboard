"use client";
import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import ControlsBar from "@/components/ControlsBar";
import DashboardView from "@/components/DashboardView";
import DrillView from "@/components/DrillView";
import HeatmapView from "@/components/HeatmapView";
import AlertsView from "@/components/AlertsView";
import MapView from "@/components/MapView";
import { buildStations } from "@/lib/data";
import type { View, Range, Unit, Theme, Density, AccentPreset } from "@/lib/types";

const ACCENT_PRESETS: AccentPreset[] = [
  { light: "#155f82", dark: "#0f9ed5", name: "Teal" },
  { light: "#0f9ed5", dark: "#4cb8e0", name: "Sky" },
  { light: "#196b24", dark: "#4ea72e", name: "Green" },
  { light: "#4e2a41", dark: "#96607d", name: "Plum" },
  { light: "#e97132", dark: "#f0a956", name: "Orange" },
  { light: "#a02b93", dark: "#c45cb6", name: "Magenta" },
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
  const [seed, setSeed] = useState(42);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filter, setFilter] = useState(["central", "waitakere", "takapuna", "manukau"]);

  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccent] = useState("#155f82");
  const [density, setDensity] = useState<Density>("comfy");
  const [showAI, setShowAI] = useState(true);

  // Load persisted preferences on mount
  useEffect(() => {
    setTheme(getLS<Theme>("theme", "light"));
    setAccent(getLS<string>("accent", "#155f82"));
    setDensity(getLS<Density>("density", "comfy"));
    setShowAI(getLS<boolean>("showAI", true));
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
    setLS("showAI", showAI);
  }, [theme, accent, density, showAI]);

  const accentHex = useMemo(() => {
    const preset = ACCENT_PRESETS.find((p) => p.light === accent) ?? ACCENT_PRESETS[0];
    return theme === "dark" ? preset.dark : preset.light;
  }, [accent, theme]);

  const stations = useMemo(() => buildStations(seed), [seed]);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => {
      setSeed((s) => s + 1);
      setLastUpdated(new Date());
      setRefreshing(false);
    }, 900);
  }

  function toggleFilter(id: string) {
    setFilter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  function handleView(v: View) {
    setView(v);
    setOpenedId(null);
  }

  const openedStation = useMemo(() => stations.find((s) => s.id === openedId), [openedId, stations]);

  return (
    <div className="app">
      <Header lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={handleRefresh}
        theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />

      {!openedStation && (
        <ControlsBar view={view} onView={handleView} range={range} onRange={setRange}
          unit={unit} onUnit={setUnit} stations={stations} filter={filter} onFilter={toggleFilter}
          showLocations={view === "dashboard"} hideRangeControls={view === "map"} />
      )}

      {openedStation ? (
        <DrillView station={openedStation} range={range} unit={unit} accent={accentHex}
          onBack={() => setOpenedId(null)} />
      ) : view === "dashboard" ? (
        <DashboardView stations={stations} range={range} unit={unit} accent={accentHex}
          filter={filter} onOpen={setOpenedId} />
      ) : view === "map" ? (
        <MapView stations={stations} accent={accentHex} onOpen={setOpenedId} />
      ) : view === "heatmap" ? (
        <HeatmapView stations={stations} accent={accentHex} range={range} />
      ) : (
        <AlertsView stations={stations} accent={accentHex} showAI={showAI} />
      )}

      {/* Accent & settings strip — simplified from Tweaks prototype panel */}
      <div style={{ position: "fixed", bottom: 16, right: 16, display: "flex", gap: 8, alignItems: "center", zIndex: 50 }}>
        {ACCENT_PRESETS.map((p) => (
          <button key={p.light} onClick={() => setAccent(p.light)}
            title={p.name}
            style={{
              width: 18, height: 18, borderRadius: "50%",
              background: theme === "dark" ? p.dark : p.light,
              border: accent === p.light ? "2px solid var(--text)" : "2px solid transparent",
              cursor: "pointer",
              flexShrink: 0,
            }} />
        ))}
        <button className="icon-btn" style={{ fontSize: 11, width: "auto", padding: "0 10px", fontFamily: "var(--font-mono)" }}
          onClick={() => setDensity(density === "comfy" ? "compact" : "comfy")}
          title="Toggle density">
          {density === "comfy" ? "compact" : "comfy"}
        </button>
        <button className="icon-btn" style={{ fontSize: 11, width: "auto", padding: "0 10px", fontFamily: "var(--font-mono)" }}
          onClick={() => setShowAI(!showAI)}
          title="Toggle AI briefing">
          AI {showAI ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
