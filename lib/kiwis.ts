/**
 * Shared KiWIS fetching logic used by /api/rainfall (cache) and /api/rainfall/live (live).
 * Edge-runtime safe — no Node.js APIs.
 */
import { STATION_METAS } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
// KiWIS response time from Cloudflare Edge varies 6–9 s. Give each station 9 s.
const TIMEOUT_MS = 9_000;
// Hard budget for the whole sequential loop — must complete well under Edge's 30 s
// ceiling so the response is returned before Vercel terminates the function.
// 22 s leaves 8 s of headroom for serialisation and network overhead.
const TOTAL_BUDGET_MS = 22_000;
// P24H: latest 24 hours of hourly data — small payload, used for live top-up.
export const LIVE_PERIOD = "P24H";

// GitHub raw URL for the Actions-generated 30-day cache.
const GITHUB_CACHE_BASE =
  "https://raw.githubusercontent.com/dj-aklcons/rainfall-dashboard/main/data/cached-rainfall.json";

// Cache successful live responses at Vercel's edge for 5 minutes.
export const LIVE_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

interface KiWISRow {
  ts_id: string;
  data: [string, string, string][];
}

interface CachedData {
  fetchedAt: string;
  stations: Station[];
}

/** Station stub returned when KiWIS data is unavailable — empty series, flagged for the UI. */
export function makeUnavailable(meta: typeof STATION_METAS[number]): Station {
  return { ...meta, series: [], dataUnavailable: true };
}

/**
 * Guarantees all four STATION_METAS are present.
 * Any station missing from `fetched` gets an unavailable stub.
 */
export function fillMissingStations(fetched: Station[]): Station[] {
  return STATION_METAS.map(
    (meta) => fetched.find((s) => s.id === meta.id) ?? makeUnavailable(meta)
  );
}

function buildUrl(tsId: string, period = LIVE_PERIOD): string {
  const params = new URLSearchParams({
    service: "kisters", type: "queryServices",
    request: "getTimeseriesValues", datasource: "0",
    format: "dajson", period,
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `${KIWIS_BASE}?${params.toString()}&ts_id=${tsId}~Rainfall.HOURTOT`;
}

function parseKiWISRow(row: KiWISRow, meta: typeof STATION_METAS[number]): Station {
  const series: DataPoint[] = row.data.map(([timestamp, value, qualityCode]) => ({
    timestamp,
    value: value !== null && value !== "" ? Math.round(parseFloat(value) * 100) / 100 : 0,
    quality: qualityCode === "1" ? 1 : 200,
  }));
  return {
    id: meta.id, name: meta.name, site: meta.site, ts_id: meta.ts_id,
    lat: meta.lat, lng: meta.lng, elevation: meta.elevation, series,
  };
}

async function fetchStationLive(meta: typeof STATION_METAS[number]): Promise<Station> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(buildUrl(meta.ts_id), {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as KiWISRow[];
    if (!json.length || !json[0].data) throw new Error("empty response");
    return parseKiWISRow(json[0], meta);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Fetch stations one at a time — KiWIS rejects concurrent requests from the same
 * IP with HTTP 500. Sequential keeps us under its concurrency limit.
 * Respects TOTAL_BUDGET_MS so we never hit Edge Runtime's 30 s ceiling.
 */
export async function fetchStationsSequential(): Promise<{ stations: Station[]; errors: string[]; anyLive: boolean }> {
  const stations: Station[] = [];
  const errors: string[] = [];
  let anyLive = false;
  const start = Date.now();

  for (const meta of STATION_METAS) {
    const elapsed = Date.now() - start;
    if (elapsed + TIMEOUT_MS > TOTAL_BUDGET_MS) {
      errors.push(`${meta.id}: budget exhausted`);
      stations.push(makeUnavailable(meta));
      continue;
    }
    try {
      const station = await fetchStationLive(meta);
      stations.push(station);
      anyLive = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${meta.id}: ${msg}`);
      console.error(`[rainfall] ${meta.id} failed: ${msg}`);
      stations.push(makeUnavailable(meta));
    }
  }

  return { stations, errors, anyLive };
}

/**
 * Returns cached stations from GitHub, or null if missing/unavailable.
 * Serves any age — stale real telemetry beats no data.
 */
export async function tryGitHubCache(): Promise<{ stations: Station[]; fetchedAt: string } | null> {
  const url = `${GITHUB_CACHE_BASE}?t=${Date.now()}`;
  const headers: Record<string, string> = {};
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as CachedData;
    if (!data.stations?.length) throw new Error("empty");
    const ageMin = Math.round((Date.now() - new Date(data.fetchedAt).getTime()) / 60_000);
    console.log(`[rainfall] GitHub cache from ${data.fetchedAt} (${ageMin}m ago)`);
    return { stations: data.stations, fetchedAt: data.fetchedAt };
  } catch (err) {
    console.log(`[rainfall] GitHub cache unavailable: ${err}`);
    return null;
  }
}
