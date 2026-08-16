import { STATION_METAS, buildMockStations } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const TIMEOUT_MS = 8_000; // matches the working disaster-app pattern

interface KiWISRow {
  ts_id: string;
  data: [string, string, string][];
}

function buildUrl(tsId: string): string {
  // Append ts_id outside URLSearchParams so ~ is not percent-encoded to %7E
  const params = new URLSearchParams({
    service: "kisters",
    type: "queryServices",
    request: "getTimeseriesValues",
    datasource: "0",
    format: "dajson",
    period: "P30D",
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

async function fetchStation(meta: typeof STATION_METAS[number]): Promise<Station> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Use fetch() + AbortController — same pattern as the working disaster app.
    // cache: no-store prevents Next.js from caching a failed response for 5 min.
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

export async function GET() {
  const mockStations = buildMockStations();

  // allSettled: one slow/failing station doesn't block the others
  const results = await Promise.allSettled(STATION_METAS.map((m) => fetchStation(m)));

  let anyLive = false;
  const errors: string[] = [];

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

  return Response.json({ stations, isMockData: !anyLive, errors });
}
