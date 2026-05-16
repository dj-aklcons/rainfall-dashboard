import type { Station, DataPoint } from "./types";

export const STATION_METAS = [
  { id: "central",   name: "Auckland Central", site: "Albert Park",           ts_id: "648719", lat: -36.8523, lng: 174.7691, elevation: 75  },
  { id: "waitakere", name: "Waitakere",         site: "Keeling Road",          ts_id: "647722", lat: -36.9075, lng: 174.5847, elevation: 210 },
  { id: "takapuna",  name: "Takapuna",          site: "Wairau Testing Station", ts_id: "648612", lat: -36.7833, lng: 174.7644, elevation: 18  },
  { id: "manukau",   name: "Manukau",           site: "Manukau Sports Bowl",   ts_id: "649940", lat: -36.9939, lng: 174.8797, elevation: 32  },
];

// Mock data fallback — used when the live KiWIS endpoint is unreachable.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSeries(
  station: { id: string; ts_id: string },
  hours: number,
  refSeed: number
): DataPoint[] {
  const wetFactors: Record<string, number> = { central: 1.0, waitakere: 1.55, takapuna: 0.78, manukau: 0.92 };
  const stormHours: Record<string, number> = { central: 6, waitakere: 4, takapuna: 9, manukau: 11 };
  const wetFactor = wetFactors[station.id] ?? 1.0;
  const stormHour = stormHours[station.id] ?? 6;

  const rng = mulberry32(refSeed + station.id.charCodeAt(0) * 991);
  const data: DataPoint[] = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const stormCount = 1 + Math.floor(rng() * 3);
  const stormCenters: { center: number; width: number; peak: number }[] = [];
  for (let i = 0; i < stormCount; i++) {
    stormCenters.push({ center: Math.floor(rng() * hours), width: 3 + Math.floor(rng() * 6), peak: (1.5 + rng() * 6) * wetFactor });
  }
  stormCenters.push({ center: hours - stormHour, width: 4 + Math.floor(rng() * 4), peak: (2 + rng() * 5) * wetFactor });

  for (let i = 0; i < hours; i++) {
    const t = new Date(now.getTime() - (hours - 1 - i) * 3600 * 1000);
    const diurnal = 0.15 + 0.1 * Math.cos((((t.getHours() - 5) / 24)) * Math.PI * 2);
    let v = Math.max(0, (rng() - 0.78) * 0.6) * wetFactor * diurnal;
    for (const s of stormCenters) {
      const d = (i - s.center) / s.width;
      v += Math.exp(-d * d) * s.peak * (0.6 + rng() * 0.5);
    }
    v += rng() * 0.05;
    if (v < 0.02) v = 0;
    data.push({ timestamp: t.toISOString(), value: Math.round(v * 100) / 100, quality: rng() > 0.985 ? 200 : 1 });
  }
  return data;
}

export function buildMockStations(refSeed = 42): Station[] {
  const hours = 30 * 24;
  return STATION_METAS.map((s) => ({
    ...s,
    series: generateSeries(s, hours, refSeed),
  }));
}
