import { STATION_METAS, buildMockStations } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const TIMEOUT_MS = 4_000;

interface KiWISRow {
  ts_id: string;
  data: [string, string, string][];
}

function buildKiWISUrl(tsId: string): string {
  // Build base params without ts_id so URLSearchParams doesn't encode the ~ character.
  // KiWIS expects the literal ~ in "648719~Rainfall.HOURTOT" — %7E may be rejected.
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
  const mockStations = buildMockStations();

  // allSettled: a single failing station no longer kills all four.
  const results = await Promise.allSettled(STATION_METAS.map((m) => fetchStation(m)));

  let anyLive = false;
  const stations: Station[] = results.map((result, i) => {
    if (result.status === "fulfilled") {
      anyLive = true;
      return result.value;
    }
    const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error(`[rainfall] ${STATION_METAS[i].id} failed: ${msg}`);
    return mockStations.find((s) => s.id === STATION_METAS[i].id) ?? mockStations[i];
  });

  return Response.json({ stations, isMockData: !anyLive });
}
