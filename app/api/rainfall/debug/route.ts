// Diagnostic endpoint — hit /api/rainfall/debug to see per-station results.
// Safe to leave in production; returns no sensitive data.
export const dynamic = "force-dynamic";

const KIWIS_BASE = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const TIMEOUT_MS = 6_000;

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
        let parsed: unknown = null;
        try { parsed = JSON.parse(text); } catch { /* leave null */ }
        const rows = Array.isArray(parsed) ? parsed : [];
        const dataLen = rows[0]?.data?.length ?? 0;
        return {
          id: s.id, ts_id: s.ts_id, url,
          status: res.status, elapsed,
          dataPoints: dataLen,
          ok: res.ok && dataLen > 0,
          preview: text.slice(0, 300),
        };
      } catch (err) {
        clearTimeout(timer);
        return {
          id: s.id, ts_id: s.ts_id, url,
          status: null, elapsed: Date.now() - t0,
          dataPoints: 0, ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  const output = results.map((r) =>
    r.status === "fulfilled" ? r.value : { error: String(r.reason) }
  );

  return Response.json({ timestamp: new Date().toISOString(), stations: output }, {
    headers: { "Content-Type": "application/json" },
  });
}
