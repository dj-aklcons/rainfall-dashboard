import { STATION_METAS, buildMockStations } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

// KiWIS direct fetch — P48H matches the disaster-app payload size (49h, 1 station).
// Requesting P30D (720 pts × 4 stations) takes >8s and hits our timeout.
// The GitHub Actions cron fetches the full P30D and caches it below.
const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const TIMEOUT_MS = 8_000;
const LIVE_PERIOD = "P48H";

// GitHub raw URL of the file kept fresh by .github/workflows/fetch-rainfall.yml
const GITHUB_CACHE_URL =
  "https://raw.githubusercontent.com/dj-aklcons/rainfall-dashboard/main/data/cached-rainfall.json";
// No max-age: serve any cached data regardless of age. Stale real telemetry >>
// mock data. The cron keeps it fresh whenever KiWIS is reachable from Actions.

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

/** Returns cached stations from GitHub, or null if missing/empty. Serves any age — stale beats mock. */
async function tryGitHubCache(): Promise<{ stations: Station[]; fetchedAt: string } | null> {
  try {
    const res = await fetch(GITHUB_CACHE_URL, { cache: "no-store" });
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

export async function GET() {
  const mockStations = buildMockStations();
  const errors: string[] = [];

  // 1. Try GitHub Actions cache first — full P30D history. No staleness cutoff:
  //    real data from an hour (or a day) ago beats synthetic mock data.
  const cached = await tryGitHubCache();
  if (cached) {
    return Response.json({
      stations: cached.stations, isMockData: false,
      source: "cache", cacheAge: cached.fetchedAt,
    });
  }

  // 2. Fall back to direct KiWIS fetch (P48H — small payload, completes in ~2s like disaster app)
  const results = await Promise.allSettled(STATION_METAS.map((m) => fetchStationLive(m)));

  let anyLive = false;
  const stations: Station[] = results.map((result, i) => {
    if (result.status === "fulfilled") {
      anyLive = true;
      return result.value;
    }
    const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
    errors.push(`${STATION_METAS[i].id}: ${msg}`);
    console.error(`[rainfall] ${STATION_METAS[i].id} failed: ${msg}`);
    return mockStations.find((s) => s.id === STATION_METAS[i].id) ?? mockStations[i];
  });

  if (anyLive) {
    return Response.json({ stations, isMockData: false, source: "live-48h", errors });
  }

  // 3. Last resort — mock data
  return Response.json({ stations: mockStations, isMockData: true, source: "mock", errors });
}
