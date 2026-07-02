/**
 * Vision spike: lap-1 keyframes as templates, detect lap-2 markers on GX010024.
 * Run: node server/scripts/vision-lap-spike.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const FFMPEG =
  process.env.FFMPEG_PATH ??
  "C:\\Program Files\\CleverGet\\CleverGet\\ffmpeg.exe";
const VIDEO = "E:\\Racing Videos\\2-19 racing league\\GX010024.MP4";
const WIDTH = 320;
const HEIGHT = 180;
const SCAN_FPS = 8;
const SEARCH_MARGIN_S = 3.5;

const db = new Database(path.join(DATA_DIR, "lapviewer.db"), { readonly: true });
const session = db
  .prepare(`SELECT id FROM sessions WHERE fileName = 'GX010024.MP4'`)
  .get();
const markers = db
  .prepare(
    `SELECT timeSeconds, label, kind, splitIndex FROM markers WHERE sessionId = ? ORDER BY timeSeconds`,
  )
  .all(session.id);
db.close();

const lapStarts = markers.filter((m) => m.kind === "lapStart");
const lap1Start = lapStarts[0].timeSeconds;
const lap2Start = lapStarts[1].timeSeconds;
const lap3Start = lapStarts[2].timeSeconds;

function lapMarkers(lapStart, nextLapStart) {
  const end = nextLapStart ?? Infinity;
  return markers.filter(
    (m) => m.timeSeconds >= lapStart - 0.01 && m.timeSeconds < end - 0.01,
  );
}

const lap1 = lapMarkers(lap1Start, lap2Start);
const lap2Truth = lapMarkers(lap2Start, lap3Start);

const KEYFRAMES = [
  { key: "lapStart", splitIndex: null, label: "Start/Finish" },
  { key: "split-1", splitIndex: 1, label: "Top" },
  { key: "split-2", splitIndex: 2, label: "Bottom" },
  { key: "split-3", splitIndex: 3, label: "Bottom Kick" },
  { key: "split-4", splitIndex: 4, label: "eye beam" },
  { key: "split-5", splitIndex: 5, label: "after under" },
];

function findMarker(lapMarkersList, splitIndex, kind) {
  if (kind === "lapStart") {
    return lapMarkersList.find((m) => m.kind === "lapStart");
  }
  return lapMarkersList.find(
    (m) => m.kind === "split" && m.splitIndex === splitIndex,
  );
}

const workDir = path.join(DATA_DIR, "cache", "vision-spike-gx010024");
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed: ${result.stderr?.slice(-500) ?? result.error}`,
    );
  }
}

function extractFrame(timeS, outPath) {
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(timeS),
    "-i",
    VIDEO,
    "-frames:v",
    "1",
    "-vf",
    `scale=${WIDTH}:${HEIGHT}`,
    "-y",
    outPath,
  ]);
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

console.log("Vision template-matching spike — GX010024.MP4");
console.log(`Lap 1: ${formatTime(lap1Start)} .. ${formatTime(lap2Start)}`);
console.log(`Lap 2: ${formatTime(lap2Start)} .. ${formatTime(lap3Start)}`);
console.log(`Work dir: ${workDir}\n`);

/** @type {Map<string, { template: Uint8Array, lap1Time: number, label: string }>} */
const templates = new Map();

for (const kf of KEYFRAMES) {
  const m1 = findMarker(
    lap1,
    kf.splitIndex,
    kf.splitIndex == null ? "lapStart" : "split",
  );
  const m2 = findMarker(
    lap2Truth,
    kf.splitIndex,
    kf.splitIndex == null ? "lapStart" : "split",
  );
  if (!m1 || !m2) {
    console.warn(`Skipping ${kf.label}: missing lap1 or lap2 marker`);
    continue;
  }

  const templatePath = path.join(workDir, `template-${kf.key}.png`);
  extractFrame(m1.timeSeconds, templatePath);
  const template = await loadGray(templatePath);
  templates.set(kf.key, {
    template,
    lap1Time: m1.timeSeconds,
    label: kf.label,
    truthLap2: m2.timeSeconds,
    offsetFromLap1Start: m1.timeSeconds - lap1Start,
  });
}

const scanDir = path.join(workDir, "scan");
fs.mkdirSync(scanDir, { recursive: true });
const scanDuration = lap3Start - lap2Start + 1;
const scanStart = lap2Start - 0.5;

runFfmpeg([
  "-hide_banner",
  "-loglevel",
  "error",
  "-ss",
  String(scanStart),
  "-i",
  VIDEO,
  "-t",
  String(scanDuration),
  "-vf",
  `fps=${SCAN_FPS},scale=${WIDTH}:${HEIGHT}`,
  "-y",
  path.join(scanDir, "frame_%05d.png"),
]);

const scanFrames = fs
  .readdirSync(scanDir)
  .filter((f) => f.endsWith(".png"))
  .sort();

console.log(`Extracted ${scanFrames.length} scan frames @ ${SCAN_FPS} fps\n`);
console.log(
  "Feature".padEnd(14) +
    "Lap1 key".padEnd(10) +
    "Lap2 manual".padEnd(12) +
    "Detected".padEnd(12) +
    "Delta".padEnd(10) +
    "NCC".padEnd(8) +
    "2nd best Δt",
);
console.log("-".repeat(78));

const results = [];

for (const [key, meta] of templates) {
  const expected = lap2Start + meta.offsetFromLap1Start;
  const winStart = expected - SEARCH_MARGIN_S;
  const winEnd = expected + SEARCH_MARGIN_S;

  /** @type {Array<{ time: number, score: number }>} */
  const scores = [];

  for (let i = 0; i < scanFrames.length; i++) {
    const time = scanStart + i / SCAN_FPS;
    if (time < winStart || time > winEnd) continue;
    const gray = await loadGray(path.join(scanDir, scanFrames[i]));
    const score = ncc(meta.template, gray);
    scores.push({ time, score });
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];
  const delta = best ? best.time - meta.truthLap2 : null;
  const secondDelta =
    best && second ? Math.abs(second.time - best.time).toFixed(2) + "s" : "—";

  results.push({
    label: meta.label,
    lap1: meta.lap1Time,
    truth: meta.truthLap2,
    detected: best?.time ?? null,
    delta,
    ncc: best?.score ?? null,
  });

  const deltaStr =
    delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}s` : "—";
  console.log(
    meta.label.padEnd(14) +
      formatTime(meta.lap1Time).padEnd(10) +
      formatTime(meta.truthLap2).padEnd(12) +
      (best ? formatTime(best.time) : "—").padEnd(12) +
      deltaStr.padEnd(10) +
      (best ? best.score.toFixed(3) : "—").padEnd(8) +
      secondDelta,
  );
}

const matched = results.filter((r) => r.delta != null);
const meanAbs =
  matched.length > 0
    ? matched.reduce((s, r) => s + Math.abs(r.delta), 0) / matched.length
    : null;
const maxAbs =
  matched.length > 0
    ? Math.max(...matched.map((r) => Math.abs(r.delta)))
    : null;

console.log("-".repeat(78));
console.log(
  `Matched ${matched.length}/${results.length} features | mean abs error: ${meanAbs?.toFixed(2)}s | max abs error: ${maxAbs?.toFixed(2)}s`,
);
console.log(
  `\nNote: scan step = ${(1 / SCAN_FPS).toFixed(3)}s; expect up to ~${(0.5 / SCAN_FPS).toFixed(2)}s quantization error.`,
);
