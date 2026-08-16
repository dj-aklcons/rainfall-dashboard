import { STATION_METAS, buildMockStations } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

// Edge Runtime runs on Cloudflare's network (not AWS Lambda).
// KiWIS (aklc.hydrotel.co.nz:8080) is reachable from Cloudflare but limits to
// ONE concurrent request per IP — fetch stations sequentially, not in parallel.
export const runtime = "edge";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
// 6 s per station × 4 stations = 24 s max, well within Edge's 30 s limit.
const TIMEOUT_MS = 6_000;
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
 * Returns partial results: fulfilled stations plus mock fallbacks for failures.
 */
async function fetchStationsSequential(): Promise<{ stations: Station[]; errors: string[]; anyLive: boolean }> {
  const mockStations = buildMockStations();
  const stations: Station[] = [];
  const errors: string[] = [];
  let anyLive = false;

  for (const meta of STATION_METAS) {
    try {
      const station = await fetchStationLive(meta);
      stations.push(station);
      anyLive = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${meta.id}: ${msg}`);
      console.error(`[rainfall] ${meta.id} failed: ${msg}`);
      stations.push(mockStations.find((s) => s.id === meta.id) ?? mockStations[0]);
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
  //    Requires GITHUB_TOKEN env var (private repo) or make the repo public.
  const cached = await tryGitHubCache();
  if (cached) {
    return jsonResponse({
      stations: cached.stations,
      isMockData: false,
      source: "cache",
      cacheAge: cached.fetchedAt,
    }, true);
  }

  // 2. Sequential live KiWIS fetch — P24H, one station at a time.
  //    KiWIS rejects concurrent requests with HTTP 500; sequential avoids this.
  //    First caller in each 5-min window pays the ~25s cost; Vercel edge caches it for the rest.
  const { stations, errors, anyLive } = await fetchStationsSequential();

  if (anyLive) {
    return jsonResponse({ stations, isMockData: false, source: "live-24h", errors }, true);
  }

  // 3. Last resort — mock data (not cached — we want to retry KiWIS on next load)
  const mockStations = buildMockStations();
  return jsonResponse({ stations: mockStations, isMockData: true, source: "mock", errors }, false);
}
