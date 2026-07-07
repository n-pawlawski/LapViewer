/**
 * Vision auto-splits: lap-1 split keyframes → validate lap 2 → detect + insert rest.
 *
 * Usage: npx tsx server/scripts/vision-auto-splits.mjs [fileName]
 * Env: FFMPEG_PATH, MAX_MEAN_ERROR_S (default 0.5), MAX_ABS_ERROR_S (default 1.0)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { initDatabase } from "../src/db/database.js";
import { getSessionById, insertMarker } from "../src/services/sessions.js";
import { getDb } from "../src/db/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const FFMPEG =
  process.env.FFMPEG_PATH ??
  "C:\\Program Files\\CleverGet\\CleverGet\\ffmpeg.exe";
const FILE_NAME = process.argv[2] ?? "GX010012.MP4";
const WIDTH = 320;
const HEIGHT = 180;
const SCAN_FPS = 8;
const SEARCH_MARGIN_S = 3.5;
const MIN_NCC = 0.35;
const MAX_MEAN_ERROR = Number(process.env.MAX_MEAN_ERROR_S ?? 0.5);
const MAX_ABS_ERROR = Number(process.env.MAX_ABS_ERROR_S ?? 1.0);

initDatabase();

function loadSession(fileName) {
  const row = getDb()
    .prepare(
      `SELECT id, fileName, sourcePath, trackName, durationSeconds FROM sessions
       WHERE fileName = ? ORDER BY datetime(createdAt) DESC LIMIT 1`,
    )
    .get(fileName);
  if (!row) throw new Error(`No session for ${fileName}`);
  return row;
}

function loadMarkers(sessionId) {
  return getDb()
    .prepare(
      `SELECT id, timeSeconds, label, kind, splitIndex FROM markers
       WHERE sessionId = ? ORDER BY timeSeconds`,
    )
    .all(sessionId);
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr?.slice(-600) ?? result.error}`);
  }
}

function extractFrame(video, timeS, outPath) {
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(timeS),
    "-i",
    video,
    "-frames:v",
    "1",
    "-vf",
    `scale=${WIDTH}:${HEIGHT}`,
    "-y",
    outPath,
  ]);
}

function extractScanRange(video, scanStart, scanDuration, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(scanStart),
    "-i",
    video,
    "-t",
    String(scanDuration),
    "-vf",
    `fps=${SCAN_FPS},scale=${WIDTH}:${HEIGHT}`,
    "-y",
    path.join(outDir, "frame_%05d.png"),
  ]);
  return fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
}

async function loadGray(filePath) {
  const { data } = await sharp(filePath)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

function ncc(a, b) {
  if (a.length !== b.length) return -1;
  let sumA = 0;
  let sumB = 0;
  let sumAB = 0;
  let sumA2 = 0;
  let sumB2 = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  return den === 0 ? 0 : num / den;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  return `${m}:${s.padStart(5, "0")}`;
}

function lapStarts(markers) {
  return markers.filter((m) => m.kind === "lapStart");
}

function splitsInLap(markers, lapStart, nextLapStart) {
  const end = nextLapStart ?? Infinity;
  return markers.filter(
    (m) =>
      m.kind === "split" &&
      m.timeSeconds > lapStart + 0.01 &&
      m.timeSeconds < end - 0.01,
  );
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function buildSplitTemplates(video, lap1Start, lap1Splits, workDir) {
  /** @type {Map<number, { template: Uint8Array, offset: number, label: string, lap1Time: number }>} */
  const templates = new Map();
  for (const split of lap1Splits) {
    const templatePath = path.join(workDir, `template-split-${split.splitIndex}.png`);
    extractFrame(video, split.timeSeconds, templatePath);
    templates.set(split.splitIndex, {
      template: await loadGray(templatePath),
      offset: split.timeSeconds - lap1Start,
      label: split.label,
      lap1Time: split.timeSeconds,
    });
  }
  return templates;
}

async function scanWindow(video, workDir, winStart, winEnd, cacheKey) {
  const scanDir = path.join(workDir, `scan-${cacheKey}`);
  fs.rmSync(scanDir, { recursive: true, force: true });
  const duration = Math.max(0.5, winEnd - winStart + 0.5);
  const frames = extractScanRange(video, winStart, duration, scanDir);
  return { scanDir, frames, scanStart: winStart };
}

async function bestMatch(templates, splitIndex, expectedTime, scan) {
  const meta = templates.get(splitIndex);
  if (!meta) return null;
  const winStart = expectedTime - SEARCH_MARGIN_S;
  const winEnd = expectedTime + SEARCH_MARGIN_S;
  /** @type {Array<{ time: number, score: number }>} */
  const scores = [];
  for (let i = 0; i < scan.frames.length; i++) {
    const time = scan.scanStart + i / SCAN_FPS;
    if (time < winStart || time > winEnd) continue;
    const gray = await loadGray(path.join(scan.scanDir, scan.frames[i]));
    scores.push({ time, score: ncc(meta.template, gray) });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores[0] ?? null;
}

function hasSplit(markers, lapStart, nextLapStart, splitIndex) {
  return splitsInLap(markers, lapStart, nextLapStart).some(
    (s) => s.splitIndex === splitIndex,
  );
}

async function detectLapStart(lapStartTemplate, scan) {
  let best = null;
  for (let i = 0; i < scan.frames.length; i++) {
    const time = scan.scanStart + i / SCAN_FPS;
    const gray = await loadGray(path.join(scan.scanDir, scan.frames[i]));
    const score = ncc(lapStartTemplate, gray);
    if (!best || score > best.score) best = { time, score };
  }
  return best;
}

async function insertSplitsForLap({
  sessionId,
  lapNumber,
  lapStartTime,
  lapEndTime,
  templates,
  lap1Start,
  lap1Splits,
  video,
  workDir,
  markers,
}) {
  const scan = await scanWindow(
    video,
    workDir,
    lapStartTime - 0.5,
    lapEndTime,
    `lap${lapNumber}`,
  );
  let inserted = 0;
  const splitIndices = [...templates.keys()].sort((a, b) => a - b);
  for (const splitIndex of splitIndices) {
    if (hasSplit(markers, lapStartTime, lapEndTime, splitIndex)) continue;
    const ref = lap1Splits.find((s) => s.splitIndex === splitIndex);
    const expected = lapStartTime + (ref ? ref.timeSeconds - lap1Start : 0);
    const best = await bestMatch(templates, splitIndex, expected, scan);
    if (!best || best.score < MIN_NCC) {
      console.log(
        `  Lap ${lapNumber} ${templates.get(splitIndex)?.label}: skip (ncc ${best?.score?.toFixed(3) ?? "—"})`,
      );
      continue;
    }
    insertMarker(sessionId, best.time, {
      kind: "split",
      lapNumber,
      splitIndex,
    });
    inserted++;
    console.log(
      `  Lap ${lapNumber} ${templates.get(splitIndex)?.label}: inserted @ ${formatTime(best.time)} (ncc ${best.score.toFixed(3)})`,
    );
  }
  return inserted;
}

async function main() {
  const session = loadSession(FILE_NAME);
  const markers = loadMarkers(session.id);
  const starts = lapStarts(markers);
  if (starts.length < 2) {
    throw new Error("Need at least 2 lap-start markers (lap 1 and lap 2)");
  }

  const lap1Start = starts[0].timeSeconds;
  const lap2Start = starts[1].timeSeconds;
  const lap3Start = starts[2]?.timeSeconds ?? null;
  const lap1Splits = splitsInLap(markers, lap1Start, lap2Start);
  const lap2Splits = splitsInLap(markers, lap2Start, lap3Start);

  if (lap1Splits.length === 0) {
    throw new Error("Lap 1 has no split markers to use as keyframes");
  }
  if (lap2Splits.length === 0) {
    throw new Error("Lap 2 has no manual splits to validate against");
  }

  const workDir = path.join(DATA_DIR, "cache", `vision-auto-${session.id}`);
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`Vision auto-splits — ${session.fileName}`);
  console.log(`Video: ${session.sourcePath}`);
  console.log(`Track: ${session.trackName}`);
  console.log(`Lap 1 keyframes: ${lap1Splits.length} splits`);
  console.log(`Lap 2 manual splits: ${lap2Splits.length}\n`);

  const templates = await buildSplitTemplates(
    session.sourcePath,
    lap1Start,
    lap1Splits,
    workDir,
  );

  const lap2End = lap3Start ?? lap2Start + (lap2Start - lap1Start) + 5;
  const lap2Scan = await scanWindow(
    session.sourcePath,
    workDir,
    lap2Start - 0.5,
    lap2End,
    "lap2-validate",
  );

  console.log("Lap 2 validation (lap-1 keyframes → detect lap-2 splits):\n");
  console.log(
    "Split".padEnd(16) + "Manual".padEnd(12) + "Detected".padEnd(12) + "Delta".padEnd(10) + "NCC",
  );
  console.log("-".repeat(56));

  const validation = [];
  for (const truth of lap2Splits.sort((a, b) => a.splitIndex - b.splitIndex)) {
    const lap1Ref = lap1Splits.find((s) => s.splitIndex === truth.splitIndex);
    const expected = lap2Start + (lap1Ref ? lap1Ref.timeSeconds - lap1Start : 0);
    const best = await bestMatch(templates, truth.splitIndex, expected, lap2Scan);
    const delta = best ? best.time - truth.timeSeconds : null;
    validation.push({
      splitIndex: truth.splitIndex,
      label: truth.label,
      truth: truth.timeSeconds,
      detected: best?.time ?? null,
      delta,
      ncc: best?.score ?? null,
    });
    const deltaStr = delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}s` : "—";
    console.log(
      (truth.label ?? `split ${truth.splitIndex}`).padEnd(16) +
        formatTime(truth.timeSeconds).padEnd(12) +
        (best ? formatTime(best.time) : "—").padEnd(12) +
        deltaStr.padEnd(10) +
        (best ? best.score.toFixed(3) : "—"),
    );
  }

  const matched = validation.filter((v) => v.delta != null);
  const meanAbs =
    matched.length > 0
      ? matched.reduce((s, v) => s + Math.abs(v.delta), 0) / matched.length
      : null;
  const maxAbs =
    matched.length > 0 ? Math.max(...matched.map((v) => Math.abs(v.delta))) : null;

  console.log("-".repeat(56));
  console.log(
    `Lap 2: ${matched.length}/${validation.length} matched | mean ${meanAbs?.toFixed(2)}s | max ${maxAbs?.toFixed(2)}s`,
  );
  console.log(`Thresholds: mean <= ${MAX_MEAN_ERROR}s, max <= ${MAX_ABS_ERROR}s\n`);

  if (
    meanAbs == null ||
    meanAbs > MAX_MEAN_ERROR ||
    maxAbs == null ||
    maxAbs > MAX_ABS_ERROR
  ) {
    console.log("Validation failed — not inserting markers for remaining laps.");
    process.exit(1);
  }

  console.log("Validation passed. Detecting and inserting splits for remaining laps...\n");

  const lapStartTemplatePath = path.join(workDir, "template-lapstart.png");
  extractFrame(session.sourcePath, lap1Start, lapStartTemplatePath);
  const lapStartTemplate = await loadGray(lapStartTemplatePath);

  const lapDurations = [];
  for (let i = 1; i < starts.length; i++) {
    lapDurations.push(starts[i].timeSeconds - starts[i - 1].timeSeconds);
  }
  const medianLapS = median(lapDurations) ?? lap2Start - lap1Start;
  const duration = session.durationSeconds ?? lap2End + medianLapS * 5;

  let inserted = 0;
  let currentMarkers = loadMarkers(session.id);
  let currentStarts = lapStarts(currentMarkers);

  for (let lapIdx = 2; lapIdx < currentStarts.length; lapIdx++) {
    const lapStartTime = currentStarts[lapIdx].timeSeconds;
    const nextStart = currentStarts[lapIdx + 1]?.timeSeconds;
    const lapEnd = nextStart ?? Math.min(duration, lapStartTime + medianLapS + 5);
    const lapNumber = lapIdx + 1;
    console.log(`Lap ${lapNumber} (${formatTime(lapStartTime)} .. ${formatTime(lapEnd)}):`);
    inserted += await insertSplitsForLap({
      sessionId: session.id,
      lapNumber,
      lapStartTime,
      lapEndTime: lapEnd,
      templates,
      lap1Start,
      lap1Splits,
      video: session.sourcePath,
      workDir,
      markers: currentMarkers,
    });
    currentMarkers = loadMarkers(session.id);
    currentStarts = lapStarts(currentMarkers);
  }

  while (true) {
    currentMarkers = loadMarkers(session.id);
    currentStarts = lapStarts(currentMarkers);
    const lastStart = currentStarts.at(-1);
    if (!lastStart) break;

    const predicted = lastStart.timeSeconds + medianLapS;
    if (predicted >= duration - 8) break;

    const scan = await scanWindow(
      session.sourcePath,
      workDir,
      predicted - SEARCH_MARGIN_S - 0.5,
      predicted + SEARCH_MARGIN_S + 0.5,
      `sf-${Math.round(predicted)}`,
    );
    const bestStart = await detectLapStart(lapStartTemplate, scan);
    const lapStartTime =
      bestStart && bestStart.score >= MIN_NCC ? bestStart.time : predicted;
    const lapNumber = currentStarts.length + 1;

    insertMarker(session.id, lapStartTime, { kind: "lapStart" });
    console.log(
      `\nLap ${lapNumber} start: inserted @ ${formatTime(lapStartTime)} (ncc ${bestStart?.score?.toFixed(3) ?? "predicted"})`,
    );

    const lapEnd = Math.min(duration, lapStartTime + medianLapS + 5);
    currentMarkers = loadMarkers(session.id);
    inserted += await insertSplitsForLap({
      sessionId: session.id,
      lapNumber,
      lapStartTime,
      lapEndTime: lapEnd,
      templates,
      lap1Start,
      lap1Splits,
      video: session.sourcePath,
      workDir,
      markers: currentMarkers,
    });
  }

  const final = getSessionById(session.id);
  console.log(`\nDone. Inserted ${inserted} split marker(s).`);
  console.log(`Session now has ${final?.laps?.length ?? 0} lap(s) and ${final?.splits?.length ?? 0} split(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
