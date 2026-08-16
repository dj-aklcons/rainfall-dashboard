#!/usr/bin/env node
/**
 * Fetches live rainfall data from KiWIS and writes to data/cached-rainfall.json.
 * Runs via GitHub Actions cron every 30 minutes.
 * GitHub Actions runners use Azure infrastructure which may reach KiWIS
 * even when Vercel (AWS) cannot.
 */
import http from "http";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const STATIONS = [
  { id: "central",   name: "Auckland Central", site: "Albert Park",            ts_id: "648719", lat: -36.8523, lng: 174.7691, elevation: 75  },
  { id: "waitakere", name: "Waitakere",         site: "Keeling Road",           ts_id: "647722", lat: -36.9075, lng: 174.5847, elevation: 210 },
  { id: "takapuna",  name: "Takapuna",          site: "Wairau Testing Station", ts_id: "648612", lat: -36.7833, lng: 174.7644, elevation: 18  },
  { id: "manukau",   name: "Manukau",           site: "Manukau Sports Bowl",    ts_id: "649940", lat: -36.9939, lng: 174.8797, elevation: 32  },
];

function buildPath(tsId) {
  const params = new URLSearchParams({
    service: "kisters", type: "queryServices",
    request: "getTimeseriesValues", datasource: "0",
    format: "dajson", period: "P30D",
    returnfields: "Timestamp,Value,Quality Code",
    timezone: "Etc/GMT-12",
  });
  return `/KiWIS/KiWIS?${params.toString()}&ts_id=${tsId}~Rainfall.HOURTOT`;
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "aklc.hydrotel.co.nz", port: 8080, path, method: "GET",
        timeout: 10_000, headers: { Accept: "application/json" } },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
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

async function fetchStation(meta, attempt = 0) {
  try {
    const body = await httpGet(buildPath(meta.ts_id));
    const json = JSON.parse(body);
    if (!json.length || !json[0].data) throw new Error("empty response");
    const series = json[0].data.map(([timestamp, value, qualityCode]) => ({
      timestamp,
      value: value !== null && value !== "" ? Math.round(parseFloat(value) * 100) / 100 : 0,
      quality: qualityCode === "1" ? 1 : 200,
    }));
    return { ...meta, series };
  } catch (err) {
    if (attempt < 1) {
      await new Promise((r) => setTimeout(r, 1000));
      return fetchStation(meta, attempt + 1);
    }
    throw err;
  }
}

async function main() {
  console.log("Fetching rainfall data from KiWIS…");
  const results = await Promise.allSettled(STATIONS.map((s) => fetchStation(s)));

  let anyLive = false;
  const stations = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      console.log(`  ✓ ${STATIONS[i].id}: ${r.value.series.length} data points`);
      stations.push(r.value);
      anyLive = true;
    } else {
      console.error(`  ✗ ${STATIONS[i].id}: ${r.reason?.message ?? r.reason}`);
    }
  }

  if (!anyLive) {
    console.error("No stations returned data — not updating cache.");
    process.exit(1);
  }

  mkdirSync(join(ROOT, "data"), { recursive: true });
  const out = { fetchedAt: new Date().toISOString(), stations };
  writeFileSync(join(ROOT, "data/cached-rainfall.json"), JSON.stringify(out));
  console.log(`Wrote ${stations.length}/${STATIONS.length} stations to data/cached-rainfall.json`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
