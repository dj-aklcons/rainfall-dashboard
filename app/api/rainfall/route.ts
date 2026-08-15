import http from "http";
import { STATION_METAS, buildMockStations } from "@/lib/data";
import type { Station, DataPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIWIS_HOST = "aklc.hydrotel.co.nz";
const KIWIS_PORT = 8080;
const KIWIS_PATH = "/KiWIS/KiWIS";
const TIMEOUT_MS = 6_000;

interface KiWISRow {
  ts_id: string;
  data: [string, string, string][];
}

function buildPath(tsId: string): string {
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
  // Append ts_id outside URLSearchParams so ~ is not percent-encoded
  return `${KIWIS_PATH}?${params.toString()}&ts_id=${tsId}~Rainfall.HOURTOT`;
}

/** Raw Node.js HTTP — bypasses Next.js fetch wrapper and any intermediate caching. */
function httpGet(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: KIWIS_HOST, port: KIWIS_PORT, path, method: "GET",
        timeout: TIMEOUT_MS, headers: { Accept: "application/json" } },
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

async function fetchStation(
  meta: typeof STATION_METAS[number],
  attempt = 0
): Promise<Station> {
  try {
    const body = await httpGet(buildPath(meta.ts_id));
    const json = JSON.parse(body) as KiWISRow[];
    if (!json.length || !json[0].data) throw new Error("empty response");
    return parseKiWISRow(json[0], meta);
  } catch (err) {
    if (attempt < 1) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchStation(meta, attempt + 1);
    }
    throw err;
  }
}

export async function GET() {
  const mockStations = buildMockStations();
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
