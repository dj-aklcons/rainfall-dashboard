/**
 * Fast cache endpoint — returns GitHub Actions 30-day cache immediately (~1 s).
 * The client calls this first to render charts, then calls /api/rainfall/live
 * in the background to top up with the freshest hours.
 */
import { STATION_METAS } from "@/lib/data";
import { tryGitHubCache, fillMissingStations, makeUnavailable, LIVE_CACHE_HEADERS } from "@/lib/kiwis";

// Edge Runtime runs on Cloudflare's network — can reach KiWIS over HTTP.
export const runtime = "edge";

export async function GET() {
  const cached = await tryGitHubCache();

  if (cached) {
    return new Response(JSON.stringify({
      stations: fillMissingStations(cached.stations),
      source: "cache",
      cacheAge: cached.fetchedAt,
    }), { headers: LIVE_CACHE_HEADERS });
  }

  // Cache unavailable — return unavailable stubs so the client can render
  // NO DATA cards immediately while the live fetch runs in the background.
  return Response.json({
    stations: STATION_METAS.map(makeUnavailable),
    source: "unavailable",
  });
}
