export const runtime = "edge";

const KIWIS_HTTP  = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const KIWIS_HTTPS = "https://aklc.hydrotel.co.nz/KiWIS/KiWIS";

const TEST_TS_ID  = "648719"; // Auckland Central — one station for speed

function buildUrl(base: string, period: string) {
  const params = new URLSearchParams({
    service: "kisters", type: "queryServices",
    request: "getTimeseriesValues", datasource: "0",
    format: "dajson", period,
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `${base}?${params.toString()}&ts_id=${TEST_TS_ID}~Rainfall.HOURTOT`;
}

async function probe(label: string, url: string, timeoutMs: number) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    const elapsed = Date.now() - t0;
    const text = await res.text();
    let dataPoints = 0;
    try { dataPoints = JSON.parse(text)?.[0]?.data?.length ?? 0; } catch { /* skip */ }
    return { label, status: res.status, elapsed, dataPoints, ok: res.ok && dataPoints > 0,
      preview: text.slice(0, 300) };
  } catch (err) {
    clearTimeout(timer);
    return { label, status: null, elapsed: Date.now() - t0, dataPoints: 0, ok: false,
      error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  // Run all probes in parallel so total wait ≤ slowest timeout (25s)
  const [http8s, http25s, https8s] = await Promise.all([
    probe("http-port8080-8s",  buildUrl(KIWIS_HTTP,  "P1D"), 8_000),
    probe("http-port8080-25s", buildUrl(KIWIS_HTTP,  "P1D"), 25_000),
    probe("https-port443-8s",  buildUrl(KIWIS_HTTPS, "P1D"), 8_000),
  ]);

  return Response.json({
    runtime: "edge",
    timestamp: new Date().toISOString(),
    // If http-25s succeeds but http-8s doesn't: KiWIS is slow to cloud IPs, just needs longer timeout.
    // If https-443 succeeds: there's an HTTPS endpoint reachable from cloud.
    // If all fail: KiWIS blocks all cloud infra regardless of timeout/protocol.
    probes: [http8s, http25s, https8s],
  });
}
