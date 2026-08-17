import { STATION_METAS } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

// Edge Runtime runs on Cloudflare's network (not AWS Lambda).
// KiWIS (aklc.hydrotel.co.nz:8080) is reachable from Cloudflare but limits to
// ONE concurrent request per IP — fetch stations sequentially, not in parallel.
export const runtime = "edge";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
// KiWIS response time from Cloudflare Edge varies 6–9 s. Give each station 9 s.
const TIMEOUT_MS = 9_000;
// Hard budget for the whole sequential loop — stay well under Edge's 30 s ceiling.
// If a station would exceed this, skip it (falls back to mock for that station).
const TOTAL_BUDGET_MS = 26_000;
// P24H: the user wants fresh last-24-hours data; 24 pts is a small payload.
// The GitHub Actions cron fetches full P30D for historical charts.
const LIVE_PERIOD = "P24H";

// GitHub raw URL — works for public repos or when GITHUB_TOKEN env var is set.
const GITHUB_CACHE_BASE =
  "https://raw.githubusercontent.com/dj-aklcons/rainfall-dashboard/main/data/cached-rainfall.json";

interface KiWISRow {
  ts_id: string;
  data: [string, string, string][];
}

interface CachedData {
  fetchedAt: string;
  stations: Station[];
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

/** Station stub returned when KiWIS data is unavailable — empty series, flagged for the UI. */
function makeUnavailable(meta: typeof STATION_METAS[number]): Station {
  return { ...meta, series: [], dataUnavailable: true };
}

/**
 * Guarantees all four STATION_METAS are present.
 * Any station missing from `fetched` gets an unavailable stub (not mock data).
 */
function fillMissingStations(fetched: Station[]): Station[] {
  return STATION_METAS.map(
    (meta) => fetched.find((s) => s.id === meta.id) ?? makeUnavailable(meta)
  );
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
 * Returns partial results: live stations where fetched, mock fallbacks for the rest.
 */
async function fetchStationsSequential(): Promise<{ stations: Station[]; errors: string[]; anyLive: boolean }> {
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
 * Returns cached stations from GitHub, or null if missing/empty.
 * Supports private repos when GITHUB_TOKEN env var is set (Vercel env).
 * Serves any age — stale real telemetry beats synthetic mock data.
 */
async function tryGitHubCache(): Promise<{ stations: Station[]; fetchedAt: string } | null> {
  const url = `${GITHUB_CACHE_BASE}?t=${Date.now()}`;
  const headers: Record<string, string> = {};
  // Set GITHUB_TOKEN in Vercel env vars (Settings → Environment Variables) to
  // access this private repo. A fine-grained token with contents:read is enough.
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as CachedData;
    if (!data.stations?.length) throw new Error("empty");
    const ageMin = Math.round((Date.now() - new Date(data.fetchedAt).getTime()) / 60_000);
    console.log(`[rainfall] serving GitHub cache from ${data.fetchedAt} (${ageMin}m ago)`);
    return { stations: data.stations, fetchedAt: data.fetchedAt };
  } catch (err) {
    console.log(`[rainfall] GitHub cache unavailable: ${err}`);
    return null;
  }
}

// Cache successful live responses at Vercel's edge for 5 minutes.
// The first visitor after expiry pays the ~25s sequential fetch cost;
// everyone else within that window gets an instant cached response.
// Mock-data responses are never cached (no Cache-Control header).
const LIVE_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

function jsonResponse(body: unknown, cache = false) {
  const str = JSON.stringify(body);
  return cache
    ? new Response(str, { headers: LIVE_CACHE_HEADERS })
    : Response.json(body);
}

export async function GET() {
  // 1. Try GitHub cache — full P30D history for charts.
  //    Requires repo to be public, or GITHUB_TOKEN env var set in Vercel.
  const cached = await tryGitHubCache();
  if (cached) {
    return jsonResponse({
      stations: fillMissingStations(cached.stations),
      isMockData: false,
      source: "cache",
      cacheAge: cached.fetchedAt,
    }, true);
  }

  // 2. Sequential live KiWIS fetch — P24H, one station at a time.
  //    KiWIS rejects concurrent requests with HTTP 500; sequential avoids this.
  //    First caller in each 5-min window pays the ~25s cost; Vercel edge caches it for the rest.
  const { stations, errors, anyLive } = await fetchStationsSequential();

  // Always return all 4 stations — failures get dataUnavailable:true (not mock data).
  return jsonResponse({
    stations,
    isMockData: false,
    source: anyLive ? "live-24h" : "unavailable",
    errors,
  }, anyLive); // only cache when at least one station has real data
}
