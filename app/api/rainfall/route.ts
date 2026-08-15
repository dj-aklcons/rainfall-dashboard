import { STATION_METAS, buildMockStations } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

// Always fetch live data — never serve a cached route response.
export const dynamic = "force-dynamic";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const TIMEOUT_MS = 4_000; // 4s × 2 attempts = 8s, safely under Vercel's 10s function limit

interface KiWISRow {
  ts_id: string;
  data: [string, string, string][];
}

function buildKiWISUrl(tsId: string): string {
  const params = new URLSearchParams({
    service: "kisters",
    type: "queryServices",
    request: "getTimeseriesValues",
    datasource: "0",
    format: "dajson",
    ts_id: `${tsId}~Rainfall.HOURTOT`,
    period: "P30D",
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `${KIWIS_BASE}?${params.toString()}`;
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

// Fetches one station with a hard timeout. Retries once on any failure
// so a slow KiWIS cold-start doesn't immediately fall back to mock data.
async function fetchStation(
  meta: typeof STATION_METAS[number],
  attempt = 0
): Promise<Station> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(buildKiWISUrl(meta.ts_id), {
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
    if (attempt < 1) return fetchStation(meta, attempt + 1);
    throw err;
  }
}

export async function GET() {
  try {
    const stations = await Promise.all(STATION_METAS.map((m) => fetchStation(m)));
    return Response.json({ stations, isMockData: false });
  } catch (err) {
    console.error("KiWIS fetch failed, falling back to mock data:", err);
    return Response.json({ stations: buildMockStations(), isMockData: true });
  }
}
