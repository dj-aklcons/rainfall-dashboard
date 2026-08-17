export interface DataPoint {
  timestamp: string;
  value: number;
  quality: 1 | 200;
}

export interface StationMeta {
  id: string;
  name: string;
  site: string;
  ts_id: string;
  lat: number;
  lng: number;
  elevation: number;
}

export interface Station extends StationMeta {
  series: DataPoint[];
  /** True when the station's KiWIS data could not be fetched — series will be empty. */
  dataUnavailable?: boolean;
}

export type View = "dashboard" | "map" | "heatmap" | "alerts";
export type Range = "24h" | "48h" | "7d" | "30d";
export type Unit = "rate" | "total";
export type Theme = "light" | "dark";
export type Density = "comfy" | "compact";

export interface AccentPreset {
  light: string;
  dark: string;
  name: string;
}
