/**
 * Live KiWIS endpoint — fetches the latest 24 h from all stations sequentially (~25 s).
 * Called by the client after the cache is already rendered, to top up with fresh data.
 * KiWIS rejects concurrent requests from the same IP with HTTP 500 — sequential only.
 */
import { fetchStationsSequential, LIVE_CACHE_HEADERS } from "@/lib/kiwis";

export const runtime = "edge";

export async function GET() {
  const { stations, errors, anyLive } = await fetchStationsSequential();

  const body = JSON.stringify({
    stations,
    errors,
    source: anyLive ? "live-24h" : "unavailable",
  });

  // Only cache at the edge when at least one station returned real data.
  return anyLive
    ? new Response(body, { headers: LIVE_CACHE_HEADERS })
    : Response.json({ stations, errors, source: "unavailable" });
}
