export const runtime = "edge";

const KIWIS_HTTP  = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const KIWIS_HTTPS = "https://aklc.hydrotel.co.nz/KiWIS/KiWIS";
const GITHUB_CACHE_URL = "https://raw.githubusercontent.com/dj-aklcons/rainfall-dashboard/main/data/cached-rainfall.json";

const TEST_TS_ID = "648719"; // Auckland Central only — fast probe

function buildKiWISUrl(base: string, period: string) {
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
      preview: text.slice(0, 200) };
  } catch (err) {
    clearTimeout(timer);
    return { label, status: null, elapsed: Date.now() - t0, dataPoints: 0, ok: false,
      error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkGitHubCache() {
  try {
    const url = `${GITHUB_CACHE_URL}?t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json() as { fetchedAt?: string; stations?: { id: string; series?: unknown[] }[] };
    const stations = (data.stations ?? []).map(s => ({
      id: s.id, points: Array.isArray(s.series) ? s.series.length : 0,
    }));
    return { ok: stations.length > 0, fetchedAt: data.fetchedAt, stations };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  // Run all probes in parallel — total wait ≤ slowest timeout (25s)
  const [cache, http8s, http25s, https8s] = await Promise.all([
    checkGitHubCache(),
    probe("kiwis-http-8s",  buildKiWISUrl(KIWIS_HTTP,  "P1D"), 8_000),
    probe("kiwis-http-25s", buildKiWISUrl(KIWIS_HTTP,  "P1D"), 25_000),
    probe("kiwis-https-8s", buildKiWISUrl(KIWIS_HTTPS, "P1D"), 8_000),
  ]);

  return Response.json({
    runtime: "edge",
    timestamp: new Date().toISOString(),
    // cache: is the GitHub-committed JSON reachable and does it have real stations?
    cache,
    // kiwis probes: can we reach KiWIS directly from Cloudflare Edge?
    // http-25s: if this ok=true but http-8s ok=false, KiWIS is just slow → increase timeout
    // https-8s: if this ok=true, HTTPS endpoint exists and fixes mixed-content for client-side fetch
    kiwisProbes: [http8s, http25s, https8s],
  });
}
