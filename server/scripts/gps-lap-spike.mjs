/**
 * Spike: extract GoPro telemetry, detect lap crossings, compare to DB markers.
 * Run: node server/scripts/gps-lap-spike.mjs
 *
 * Uses gpmf-extract + gopro-telemetry (extraneous npm installs for spike only).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const require = createRequire(import.meta.url);
const GPMFExtract = require("gpmf-extract");
const goproTelemetry = require("gopro-telemetry");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const GEOFENCE_RADIUS_M = 25;

function extractGpmfFromFile(filePath) {
  return GPMFExtract((mp4boxFile) => {
    const fd = fs.openSync(filePath, "r");
    const size = fs.statSync(filePath).size;
    const CHUNK = 16 * 1024 * 1024;
    let offset = 0;
    while (offset < size) {
      const len = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, offset);
      const ab = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      );
      ab.fileStart = offset;
      mp4boxFile.appendBuffer(ab);
      offset += len;
    }
    fs.closeSync(fd);
    mp4boxFile.flush();
  });
}

async function parseTelemetry(rawData, timing) {
  return goproTelemetry({
    rawData,
    timing,
    stream: ["GPS5", "ACCL", "GYRO"],
    repeat: true,
    tolerant: true,
    smooth: 0,
  });
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestSample(samples, timeSeconds) {
  let best = samples[0];
  let bestDist = Infinity;
  for (const s of samples) {
    const d = Math.abs(s.cts - timeSeconds);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function detectGpsCrossings(gpsSamples, sfLat, sfLon, radiusM) {
  const crossings = [];
  let wasInside = null;
  const minGapS = 8;

  for (const s of gpsSamples) {
    const dist = haversineM(s.latitude, s.longitude, sfLat, sfLon);
    const inside = dist <= radiusM;
    if (wasInside === null) {
      wasInside = inside;
      continue;
    }
    if (!wasInside && inside) {
      const last = crossings[crossings.length - 1];
      if (last == null || s.cts - last >= minGapS) {
        crossings.push(s.cts);
      }
    }
    wasInside = inside;
  }
  return crossings;
}

function getStreamSamples(telemetry, streamName) {
  for (const devKey of Object.keys(telemetry)) {
    if (devKey === "frames/second") continue;
    const stream = telemetry[devKey]?.streams?.[streamName];
    if (stream?.samples?.length) {
      return stream.samples.map((s) => ({
        cts: s.cts,
        x: s.value[0],
        y: s.value[1],
        z: s.value[2],
        latitude: s.value?.[0],
        longitude: s.value?.[1],
      }));
    }
  }
  return [];
}

function detectAccelPeaks(acclSamples, calTimeS, lapPeriodS, lapCount) {
  const detected = [calTimeS];
  const windowS = Math.min(8, lapPeriodS * 0.15);

  for (let lap = 1; lap < lapCount; lap++) {
    const target = calTimeS + lap * lapPeriodS;
    const window = acclSamples.filter(
      (s) => s.cts >= target - windowS && s.cts <= target + windowS,
    );
    if (window.length === 0) continue;
    let best = window[0];
    for (const s of window) {
      const mag = Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2);
      const bestMag = Math.sqrt(best.x ** 2 + best.y ** 2 + best.z ** 2);
      if (mag > bestMag) best = s;
    }
    detected.push(best.cts);
  }
  return detected;
}

function compareMarkersSeconds(detectedS, manualSeconds) {
  const rows = [];
  const used = new Set();
  for (const manual of manualSeconds) {
    let bestIdx = -1;
    let bestDelta = Infinity;
    for (let i = 0; i < detectedS.length; i++) {
      if (used.has(i)) continue;
      const delta = Math.abs(detectedS[i] - manual);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDelta <= 15) {
      used.add(bestIdx);
      rows.push({
        manual,
        detected: detectedS[bestIdx],
        delta: detectedS[bestIdx] - manual,
      });
    } else {
      rows.push({ manual, detected: null, delta: null });
    }
  }
  return rows;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  return `${m}:${s.padStart(5, "0")}`;
}

function summarizeComparison(label, comparison) {
  const matched = comparison.filter((r) => r.detected != null);
  const deltas = matched.map((r) => r.delta);
  const meanAbs =
    deltas.length > 0
      ? deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length
      : null;

  console.log(`\n${label}: ${matched.length}/${comparison.length} matched`);
  if (meanAbs != null) {
    console.log(`  Mean abs error: ${meanAbs.toFixed(2)}s`);
  }
  for (const row of comparison) {
    const det = row.detected != null ? formatTime(row.detected) : "—";
    const delta =
      row.delta != null ? `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(2)}s` : "—";
    console.log(`    manual ${formatTime(row.manual)} -> ${det} (${delta})`);
  }
}

async function runSession(db, session) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`Session: ${session.title} (${session.fileName})`);
  console.log(`Track: ${session.trackName ?? "(none)"}`);

  if (!fs.existsSync(session.sourcePath)) {
    console.log("ERROR: source file missing");
    return;
  }

  const markers = db
    .prepare(
      `SELECT timeSeconds, label, kind FROM markers WHERE sessionId = ? AND kind = 'lapStart' ORDER BY timeSeconds`,
    )
    .all(session.id);

  console.log(`Manual lap-start markers: ${markers.length}`);
  console.log("Extracting GPMF metadata (streaming file)...");

  let rawData;
  let timing;
  try {
    ({ rawData, timing } = await extractGpmfFromFile(session.sourcePath));
  } catch (err) {
    console.log(`GPMF extract failed: ${err.message ?? err}`);
    return;
  }

  console.log(
    `GPMF payload: ${(rawData.length / 1024 / 1024).toFixed(1)} MB | ${timing.samples?.length ?? 0} samples`,
  );

  let telemetry;
  try {
    telemetry = await parseTelemetry(rawData, timing);
  } catch (err) {
    console.log(`Telemetry parse failed: ${err.message ?? err}`);
    return;
  }

  const gpsSamples = getStreamSamples(telemetry, "GPS5").filter(
    (s) =>
      s.latitude != null &&
      s.longitude != null &&
      Math.abs(s.latitude) <= 90 &&
      Math.abs(s.longitude) <= 180 &&
      (s.latitude !== 0 || s.longitude !== 0),
  );
  const acclSamples = getStreamSamples(telemetry, "ACCL");

  console.log(
    `Parsed: GPS5=${gpsSamples.length} samples, ACCL=${acclSamples.length} samples`,
  );
  if (acclSamples.length > 0) {
    console.log(
      `ACCL time range: ${formatTime(acclSamples[0].cts)} .. ${formatTime(acclSamples[acclSamples.length - 1].cts)}`,
    );
  }

  if (gpsSamples.length > 0) {
    console.log(`GPS points: ${gpsSamples.length}`);
    console.log(
      `Bounds: lat ${Math.min(...gpsSamples.map((s) => s.latitude)).toFixed(6)}..${Math.max(...gpsSamples.map((s) => s.latitude)).toFixed(6)}, lon ${Math.min(...gpsSamples.map((s) => s.longitude)).toFixed(6)}..${Math.max(...gpsSamples.map((s) => s.longitude)).toFixed(6)}`,
    );

    if (markers.length === 0) {
      console.log("No manual markers — GPS track extracted successfully.");
      return;
    }

    const cal = nearestSample(gpsSamples, markers[0].timeSeconds);
    console.log(
      `\nCalibrating start/finish from manual marker @ ${formatTime(markers[0].timeSeconds)}`,
    );
    console.log(
      `  GPS @ that time: lat=${cal.latitude.toFixed(6)} lon=${cal.longitude.toFixed(6)}`,
    );

    for (const radius of [15, 25, 40]) {
      const detected = detectGpsCrossings(
        gpsSamples,
        cal.latitude,
        cal.longitude,
        radius,
      );
      const comparison = compareMarkersSeconds(
        detected,
        markers.map((m) => m.timeSeconds),
      );
      summarizeComparison(`GPS geofence ${radius}m (${detected.length} crossings)`, comparison);
    }
    return;
  }

  console.log("No GPS coordinates in metadata (GPS was off or no lock).");

  const acclSamplesOnly = acclSamples;
  if (acclSamplesOnly.length < 20 || markers.length < 2) {
    console.log("Not enough accelerometer data for fallback demo.");
    return;
  }

  const intervals = [];
  for (let i = 1; i < markers.length; i++) {
    intervals.push(markers[i].timeSeconds - markers[i - 1].timeSeconds);
  }
  const sorted = [...intervals].sort((a, b) => a - b);
  const medianLapS = sorted[Math.floor(sorted.length / 2)];
  const detected = detectAccelPeaks(
    acclSamplesOnly,
    markers[0].timeSeconds,
    medianLapS,
    markers.length,
  );
  const comparison = compareMarkersSeconds(
    detected,
    markers.map((m) => m.timeSeconds),
  );
  summarizeComparison(
    `Accel peak fallback (median lap ${medianLapS.toFixed(1)}s — experimental only)`,
    comparison,
  );
}

async function main() {
  const dbPath = path.join(DATA_DIR, "lapviewer.db");
  const db = new Database(dbPath, { readonly: true });
  const sessions = db
    .prepare(
      `SELECT id, title, fileName, sourcePath, trackName, durationSeconds FROM sessions ORDER BY createdAt`,
    )
    .all();

  console.log(`GPS lap-detection spike — ${sessions.length} session(s) in DB`);
  for (const session of sessions) {
    await runSession(db, session);
  }
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
