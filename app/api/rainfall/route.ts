import http from "http";
import { STATION_METAS, buildMockStations } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── KiWIS direct fetch ───────────────────────────────────────────────────────
// NOTE: aklc.hydrotel.co.nz:8080 blocks Vercel/AWS IPs. Direct fetch will
// timeout on Vercel; it works from GitHub Actions (Azure). The fallback chain
// is: KiWIS direct → GitHub-cached data → mock data.

const KIWIS_HOST = "aklc.hydrotel.co.nz";
const KIWIS_PORT = 8080;
const KIWIS_PATH = "/KiWIS/KiWIS";
const KIWIS_TIMEOUT_MS = 4_000; // Short — we know Vercel can't reach it, fail fast

// Raw URL of the data file kept fresh by GitHub Actions cron.
// Vercel CAN reach raw.githubusercontent.com (standard HTTPS).
const GITHUB_CACHE_URL =
  "https://raw.githubusercontent.com/dj-aklcons/rainfall-dashboard/main/data/cached-rainfall.json";

interface KiWISRow {
  ts_id: string;
  data: [string, string, string][];
}

interface CachedData {
  fetchedAt: string;
  stations: Station[];
}

function buildPath(tsId: string): string {
  const params = new URLSearchParams({
    service: "kisters", type: "queryServices",
    request: "getTimeseriesValues", datasource: "0",
    format: "dajson", period: "P30D",
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `${KIWIS_PATH}?${params.toString()}&ts_id=${tsId}~Rainfall.HOURTOT`;
}

function httpGet(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: KIWIS_HOST, port: KIWIS_PORT, path, method: "GET",
        timeout: KIWIS_TIMEOUT_MS, headers: { Accept: "application/json" } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}`));
          else resolve(body);
        });
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
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

async function tryKiWISDirect(): Promise<Station[] | null> {
  const results = await Promise.allSettled(
    STATION_METAS.map(async (meta) => {
      try {
        const body = await httpGet(buildPath(meta.ts_id));
        const json = JSON.parse(body) as KiWISRow[];
        if (!json.length || !json[0].data) throw new Error("empty response");
        return parseKiWISRow(json[0], meta);
      } catch (err) {
        // Retry once
        const body = await httpGet(buildPath(meta.ts_id));
        const json = JSON.parse(body) as KiWISRow[];
        if (!json.length || !json[0].data) throw new Error("empty response");
        return parseKiWISRow(json[0], meta);
      }
    })
  );

  let anyLive = false;
  const stations = results.map((r, i) => {
    if (r.status === "fulfilled") { anyLive = true; return r.value; }
    console.error(`[rainfall/direct] ${STATION_METAS[i].id}: ${r.reason}`);
    return null;
  });

  return anyLive ? (stations.filter(Boolean) as Station[]) : null;
}

async function tryGitHubCache(): Promise<Station[] | null> {
  try {
    const res = await fetch(GITHUB_CACHE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as CachedData;
    if (!data.stations?.length) throw new Error("empty cache");
    const ageMs = Date.now() - new Date(data.fetchedAt).getTime();
    const ageMin = Math.round(ageMs / 60_000);
    console.log(`[rainfall/cache] serving data fetched ${ageMin}m ago (${data.fetchedAt})`);
    return data.stations;
  } catch (err) {
    console.error(`[rainfall/cache] failed: ${err}`);
    return null;
  }
}

export async function GET() {
  // 1. Try direct KiWIS fetch (fast-fail on Vercel — server blocks AWS)
  const live = await tryKiWISDirect();
  if (live) {
    return Response.json({ stations: live, isMockData: false, source: "live" });
  }

  // 2. Fall back to data cached by GitHub Actions cron
  const cached = await tryGitHubCache();
  if (cached) {
    return Response.json({ stations: cached, isMockData: false, source: "cache" });
  }

  // 3. Last resort: generated mock data
  console.error("[rainfall] all sources failed — returning mock data");
  return Response.json({ stations: buildMockStations(), isMockData: true, source: "mock" });
}
