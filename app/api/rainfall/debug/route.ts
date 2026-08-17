export const runtime = "edge";

const KIWIS_HTTP  = "http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS";
const KIWIS_HTTPS = "https://aklc.hydrotel.co.nz/KiWIS/KiWIS";
const GITHUB_CACHE_URL = "https://raw.githubusercontent.com/dj-aklcons/rainfall-dashboard/main/data/cached-rainfall.json";

// Test all 4 stations to find if Takapuna specifically has a KiWIS issue
const STATIONS = [
  { id: "central",   ts_id: "648719" },
  { id: "waitakere", ts_id: "647722" },
  { id: "takapuna",  ts_id: "648612" },
  { id: "manukau",   ts_id: "649940" },
];

function buildKiWISUrl(base: string, period: string, tsId = "648719") {
  const params = new URLSearchParams({
    service: "kisters", type: "queryServices",
    request: "getTimeseriesValues", datasource: "0",
    format: "dajson", period,
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `${base}?${params.toString()}&ts_id=${tsId}~Rainfall.HOURTOT`;
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
  // Check cache and all 4 stations sequentially (concurrent requests get rejected by KiWIS)
  const cache = await checkGitHubCache();

  const stationResults = [];
  for (const s of STATIONS) {
    const url = buildKiWISUrl(KIWIS_HTTP, "P1D", s.ts_id);
    const result = await probe(`${s.id} (${s.ts_id})`, url, 12_000);
    stationResults.push(result);
  }

  return Response.json({
    runtime: "edge",
    timestamp: new Date().toISOString(),
    cache,
    // Sequential per-station probes — shows if Takapuna has a KiWIS data issue
    stations: stationResults,
  });
}
