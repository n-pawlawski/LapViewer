import fs from "node:fs";
import path from "node:path";
import { initDatabase } from "../src/db/database.js";
import { getDb } from "../src/db/database.js";
import { getSessionById, getSessionSourcePath } from "../src/services/sessions.js";
import { getTrackByName } from "../src/services/tracks.js";
import {
  listSplitBankTemplates,
  medianLapOffsetForSplit,
} from "../src/services/splitBank.js";
import { loadFullFrameGrayFromFile } from "../src/services/lapDetection.js";
import { detectSplitInScan, buildSplitDetectionProposals } from "../src/services/splitDetectionMath.js";
import { bestBankScore } from "../src/services/lapDetectionMath.js";
import { DATA_DIR, DETECTION_FRAME_WIDTH, DETECTION_FRAME_HEIGHT, FFMPEG_PATH } from "../src/config.js";
import { spawnSync } from "node:child_process";

initDatabase();
const db = getDb();
const target = db.prepare(`SELECT id, title, userId FROM sessions WHERE title LIKE '%Nick%OG%' LIMIT 1`).get();
const detail = getSessionById(target.id, target.userId);
const track = getTrackByName(detail.track, target.userId);
const lap = detail.laps.find((l) => l.lapNumber === 4);
if (!lap) throw new Error("lap 4 not found");
const missing = [1, 2, 3, 4, 5, 6];

const scanFps = 5;
const scanStart = lap.startSeconds - 0.25;
const duration = lap.endSeconds - scanStart;
const scanDir = path.join(DATA_DIR, "cache", target.id, "debug-split-scan");
fs.mkdirSync(scanDir, { recursive: true });
for (const f of fs.readdirSync(scanDir)) if (f.endsWith(".png")) fs.rmSync(path.join(scanDir, f));

spawnSync(FFMPEG_PATH, [
  "-hide_banner", "-loglevel", "error",
  "-ss", String(scanStart), "-i", getSessionSourcePath(target.id, target.userId),
  "-t", String(duration),
  "-vf", `fps=${scanFps},scale=${DETECTION_FRAME_WIDTH}:${DETECTION_FRAME_HEIGHT}`,
  "-y", path.join(scanDir, "frame_%06d.png"),
], { encoding: "utf8" });

const frames = fs.readdirSync(scanDir).filter((f) => f.endsWith(".png")).sort();
const frameTimes = [];
const frameGrays = [];
for (let i = 0; i < frames.length; i++) {
  const t = scanStart + i / scanFps;
  if (t > lap.endSeconds) break;
  frameTimes.push(t);
  frameGrays.push(await loadFullFrameGrayFromFile(path.join(scanDir, frames[i])));
}

console.log(`Lap 4: ${lap.startSeconds.toFixed(1)}-${lap.endSeconds.toFixed(1)}, ${frameTimes.length} frames\n`);

let searchFromSec = lap.startSeconds + 0.05;
for (const splitIndex of missing) {
  const templates = listSplitBankTemplates(track.id, splitIndex);
  const median = medianLapOffsetForSplit(track.id, splitIndex);
  const expected = lap.startSeconds + (median ?? 0);
  const windowStart = Math.max(searchFromSec, expected - 4);
  const windowEnd = Math.min(lap.endSeconds - 0.05, expected + 4);
  const name = track.splits.find((s) => s.splitIndex === splitIndex)?.name;

  const match = detectSplitInScan(frameTimes, frameGrays, templates, windowStart, windowEnd, 0.35);

  // Best score in window regardless of threshold
  let bestAny = -1;
  let bestAnyTime = 0;
  for (let i = 0; i < frameTimes.length; i++) {
    const t = frameTimes[i];
    if (t < windowStart || t > windowEnd) continue;
    const s = bestBankScore(frameGrays[i], templates);
    if (s > bestAny) { bestAny = s; bestAnyTime = t; }
  }

  // Best in full remaining lap
  let bestRemain = -1;
  let bestRemainTime = 0;
  for (let i = 0; i < frameTimes.length; i++) {
    const t = frameTimes[i];
    if (t < searchFromSec || t > lap.endSeconds - 0.05) continue;
    const s = bestBankScore(frameGrays[i], templates);
    if (s > bestRemain) { bestRemain = s; bestRemainTime = t; }
  }

  console.log(
    `Split ${splitIndex} (${name}): expected=${expected.toFixed(2)} window=[${windowStart.toFixed(2)}, ${windowEnd.toFixed(2)}]` +
    (windowStart > windowEnd ? " COLLAPSED" : ""),
  );
  console.log(`  match>=0.35: ${match ? `${match.timeSeconds.toFixed(2)} @ ${match.score.toFixed(3)}` : "NONE"}`);
  console.log(`  best in window: ${bestAnyTime.toFixed(2)} @ ${bestAny.toFixed(3)}`);
  console.log(`  best remaining lap: ${bestRemainTime.toFixed(2)} @ ${bestRemain.toFixed(3)}`);
  console.log(`  searchFromSec after: ${match ? (match.timeSeconds + 0.15).toFixed(2) : searchFromSec.toFixed(2)}\n`);

  if (match) searchFromSec = match.timeSeconds + 0.15;
}

const proposals = buildSplitDetectionProposals({
  missingSplitIndices: missing,
  frameTimes,
  frameGrays,
  bankBySplitIndex: new Map(missing.map((idx) => [idx, listSplitBankTemplates(track.id, idx)])),
  medianOffsetBySplitIndex: new Map(
    missing
      .map((idx) => {
        const m = medianLapOffsetForSplit(track.id, idx);
        return m != null ? [idx, m] : null;
      })
      .filter(Boolean),
  ),
  lapStartSec: lap.startSeconds,
  lapEndSec: lap.endSeconds,
});
console.log("Final proposals:", proposals.map((p) => p.splitIndex).join(", "));
