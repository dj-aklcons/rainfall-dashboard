export const runtime = "edge";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const TIMEOUT_MS = 8_000;

const STATIONS = [
  { id: "central",   ts_id: "648719" },
  { id: "waitakere", ts_id: "647722" },
  { id: "takapuna",  ts_id: "648612" },
  { id: "manukau",   ts_id: "649940" },
];

function buildUrl(tsId: string) {
  const params = new URLSearchParams({
    service: "kisters", type: "queryServices",
    request: "getTimeseriesValues", datasource: "0",
    format: "dajson", period: "P1D",
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `${KIWIS_BASE}?${params.toString()}&ts_id=${tsId}~Rainfall.HOURTOT`;
}

export async function GET() {
  const results = await Promise.allSettled(
    STATIONS.map(async (s) => {
      const url = buildUrl(s.ts_id);
      const t0 = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timer);
        const elapsed = Date.now() - t0;
        const text = await res.text();
        let dataPoints = 0;
        try { dataPoints = JSON.parse(text)?.[0]?.data?.length ?? 0; } catch { /* skip */ }
        return { id: s.id, ts_id: s.ts_id, status: res.status, elapsed, dataPoints,
          ok: res.ok && dataPoints > 0, preview: text.slice(0, 200) };
      } catch (err) {
        clearTimeout(timer);
        return { id: s.id, ts_id: s.ts_id, status: null, elapsed: Date.now() - t0,
          dataPoints: 0, ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  return Response.json({
    runtime: "edge",
    timestamp: new Date().toISOString(),
    stations: results.map((r) => r.status === "fulfilled" ? r.value : { error: String(r.reason) }),
  });
}
