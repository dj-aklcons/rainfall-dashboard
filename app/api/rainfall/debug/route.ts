import http from "http";
export const dynamic = "force-dynamic";

const KIWIS_HOST = "aklc.hydrotel.co.nz";
const KIWIS_PORT = 8080;
const KIWIS_PATH = "/KiWIS/KiWIS";
const TIMEOUT_MS = 8_000;

const STATIONS = [
  { id: "central",   ts_id: "648719" },
  { id: "waitakere", ts_id: "647722" },
  { id: "takapuna",  ts_id: "648612" },
  { id: "manukau",   ts_id: "649940" },
];

function buildPath(tsId: string) {
  const params = new URLSearchParams({
    service: "kisters", type: "queryServices",
    request: "getTimeseriesValues", datasource: "0",
    format: "dajson", period: "P1D",
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `${KIWIS_PATH}?${params.toString()}&ts_id=${tsId}~Rainfall.HOURTOT`;
}

function httpGet(path: string): Promise<{ body: string; status: number; elapsed: number }> {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: KIWIS_HOST, port: KIWIS_PORT, path, method: "GET",
        timeout: TIMEOUT_MS, headers: { Accept: "application/json" } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({
          body: Buffer.concat(chunks).toString("utf8"),
          status: res.statusCode ?? 0,
          elapsed: Date.now() - t0,
        }));
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e) => reject(Object.assign(e, { elapsed: Date.now() - t0 })));
    req.end();
  });
}

export async function GET() {
  const results = await Promise.allSettled(
    STATIONS.map(async (s) => {
      const path = buildPath(s.ts_id);
      const url = `http://${KIWIS_HOST}:${KIWIS_PORT}${path}`;
      try {
        const { body, status, elapsed } = await httpGet(path);
        let dataPoints = 0;
        try {
          const json = JSON.parse(body);
          dataPoints = Array.isArray(json) ? (json[0]?.data?.length ?? 0) : 0;
        } catch { /* unparseable */ }
        return { id: s.id, ts_id: s.ts_id, url, status, elapsed, dataPoints,
          ok: status === 200 && dataPoints > 0, preview: body.slice(0, 200) };
      } catch (err) {
        const e = err as Error & { elapsed?: number };
        return { id: s.id, ts_id: s.ts_id, url, status: null,
          elapsed: e.elapsed ?? TIMEOUT_MS, dataPoints: 0, ok: false,
          error: e.message };
      }
    })
  );

  const stations = results.map((r) =>
    r.status === "fulfilled" ? r.value : { error: String(r.reason) }
  );

  return Response.json({ timestamp: new Date().toISOString(), stations });
}
