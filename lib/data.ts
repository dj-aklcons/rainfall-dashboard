import type { Station, DataPoint } from "./types";

const STATION_METAS = [
  { id: "central",   name: "Auckland Central", site: "Albert Park",          ts_id: "648719", lat: -36.8523, lng: 174.7691, elevation: 75,  wetFactor: 1.00, stormHour: 6  },
  { id: "waitakere", name: "Waitakere",         site: "Keeling Road",         ts_id: "647722", lat: -36.9075, lng: 174.5847, elevation: 210, wetFactor: 1.55, stormHour: 4  },
  { id: "takapuna",  name: "Takapuna",          site: "Wairau Testing Station",ts_id: "648612", lat: -36.7833, lng: 174.7644, elevation: 18,  wetFactor: 0.78, stormHour: 9  },
  { id: "manukau",   name: "Manukau",           site: "Manukau Sports Bowl",  ts_id: "649940", lat: -36.9939, lng: 174.8797, elevation: 32,  wetFactor: 0.92, stormHour: 11 },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSeries(
  station: { id: string; wetFactor: number; stormHour: number },
  hours: number,
  refSeed: number
): DataPoint[] {
  const rng = mulberry32(refSeed + station.id.charCodeAt(0) * 991);
  const data: DataPoint[] = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const stormCount = 1 + Math.floor(rng() * 3);
  const stormCenters: { center: number; width: number; peak: number }[] = [];
  for (let i = 0; i < stormCount; i++) {
    stormCenters.push({ center: Math.floor(rng() * hours), width: 3 + Math.floor(rng() * 6), peak: (1.5 + rng() * 6) * station.wetFactor });
  }
  stormCenters.push({ center: hours - station.stormHour, width: 4 + Math.floor(rng() * 4), peak: (2 + rng() * 5) * station.wetFactor });

  for (let i = 0; i < hours; i++) {
    const t = new Date(now.getTime() - (hours - 1 - i) * 3600 * 1000);
    const hourOfDay = t.getHours();
    const diurnal = 0.15 + 0.1 * Math.cos(((hourOfDay - 5) / 24) * Math.PI * 2);
    let v = Math.max(0, (rng() - 0.78) * 0.6) * station.wetFactor * diurnal;
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

export function buildStations(refSeed = 42): Station[] {
  const hours = 30 * 24;
  return STATION_METAS.map((s) => ({
    id: s.id,
    name: s.name,
    site: s.site,
    ts_id: s.ts_id,
    lat: s.lat,
    lng: s.lng,
    elevation: s.elevation,
    series: generateSeries(s, hours, refSeed),
  }));
}
