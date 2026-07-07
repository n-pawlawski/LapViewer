/**
 * Lap-start detection spike (ROI + whole-video scan + peak picking).
 *
 * Detects lap-start times by matching a small right-side region of interest
 * (the checkered-flag barrier) across the whole video, then compares the
 * detected starts to the manually-corrected lap starts in the DB.
 *
 * Read-only: does NOT modify the database.
 *
 * Usage:  npx tsx server/scripts/vision-lapstart-spike.mjs [fileName]
 * Env:
 *   FFMPEG_PATH   path to ffmpeg (HEVC-capable)
 *   SCAN_FPS      frames/sec to sample across the video (default 5)
 *   MIN_GAP_S     minimum seconds between detected starts (default 15)
 *   ROI           "x0,y0,x1,y1" as fractions 0..1 (default "0.6,0,1,1" = right 40%)
 *   REF_LAPS      1-based lap indices to average into the template (default "1")
 *   NCC_THRESHOLD minimum score to accept a peak (default 0.4)
 *   MATCH_TOL_S   tolerance when matching detections to truth (default 2.0)
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
const FILE_NAME = process.argv[2] ?? "GX010012.MP4";

const WIDTH = 320;
const HEIGHT = 180;
const SCAN_FPS = Number(process.env.SCAN_FPS ?? 5);
const MIN_GAP_S = Number(process.env.MIN_GAP_S ?? 15);
const NCC_THRESHOLD = Number(process.env.NCC_THRESHOLD ?? 0.4);
const MATCH_TOL_S = Number(process.env.MATCH_TOL_S ?? 2.0);
const REF_LAPS = (process.env.REF_LAPS ?? "1")
  .split(",")
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isInteger(n) && n >= 1);

const roiFrac = (process.env.ROI ?? "0.6,0,1,1").split(",").map(Number);
const ROI = {
  left: Math.round(roiFrac[0] * WIDTH),
  top: Math.round(roiFrac[1] * HEIGHT),
  width: Math.round((roiFrac[2] - roiFrac[0]) * WIDTH),
  height: Math.round((roiFrac[3] - roiFrac[1]) * HEIGHT),
};

function loadSession(fileName) {
  const db = new Database(path.join(DATA_DIR, "lapviewer.db"), {
    readonly: true,
  });
  const session = db
    .prepare(
      `SELECT id, fileName, sourcePath, trackName, durationSeconds FROM sessions
       WHERE fileName = ? ORDER BY datetime(createdAt) DESC LIMIT 1`,
    )
    .get(fileName);
  const starts = db
    .prepare(
      `SELECT timeSeconds FROM markers WHERE sessionId = ? AND kind = 'lapStart' ORDER BY timeSeconds`,
    )
    .all(session.id)
    .map((r) => r.timeSeconds);
  db.close();
  return { session, starts };
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr?.slice(-600) ?? result.error}`);
  }
}

function extractFrame(video, timeS, outPath) {
  runFfmpeg([
    "-hide_banner", "-loglevel", "error",
    "-ss", String(timeS),
    "-i", video,
    "-frames:v", "1",
    "-vf", `scale=${WIDTH}:${HEIGHT}`,
    "-y", outPath,
  ]);
}

function extractWholeVideo(video, outDir) {
  const existing = fs.existsSync(outDir)
    ? fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort()
    : [];
  // Reuse cached scan frames when present (dir name is keyed by fps).
  if (existing.length > 0) return existing;
  fs.mkdirSync(outDir, { recursive: true });
  runFfmpeg([
    "-hide_banner", "-loglevel", "error",
    "-i", video,
    "-vf", `fps=${SCAN_FPS},scale=${WIDTH}:${HEIGHT}`,
    "-y", path.join(outDir, "frame_%06d.png"),
  ]);
  return fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
}

async function loadRoiGray(filePath) {
  const { data } = await sharp(filePath)
    .extract(ROI)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

function ncc(a, b) {
  if (a.length !== b.length) return -1;
  let sA = 0, sB = 0, sAB = 0, sA2 = 0, sB2 = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    sA += a[i]; sB += b[i];
    sAB += a[i] * b[i];
    sA2 += a[i] * a[i]; sB2 += b[i] * b[i];
  }
  const num = n * sAB - sA * sB;
  const den = Math.sqrt((n * sA2 - sA * sA) * (n * sB2 - sB * sB));
  return den === 0 ? 0 : num / den;
}

function averageTemplates(templates) {
  const n = templates[0].length;
  const acc = new Float64Array(n);
  for (const t of templates) for (let i = 0; i < n; i++) acc[i] += t[i];
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.round(acc[i] / templates.length);
  return out;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  return `${m}:${s.padStart(5, "0")}`;
}

/** Greedy non-max suppression: strongest peaks first, spaced >= minGap. */
function pickPeaks(timeline, threshold, minGapS) {
  const candidates = timeline
    .filter((p) => p.score >= threshold)
    .sort((a, b) => b.score - a.score);
  const picked = [];
  for (const c of candidates) {
    if (picked.every((p) => Math.abs(p.time - c.time) >= minGapS)) {
      picked.push(c);
    }
  }
  return picked.sort((a, b) => a.time - b.time);
}

/** Dominant period (s) via autocorrelation of the score timeline. */
function estimatePeriod(timeline, fps, minP, maxP) {
  const s = timeline.map((p) => p.score);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const c = s.map((v) => v - mean);
  let bestLag = -1, bestVal = -Infinity;
  for (let lag = Math.round(minP * fps); lag <= Math.round(maxP * fps); lag++) {
    let sum = 0;
    for (let i = 0; i + lag < c.length; i++) sum += c[i] * c[i + lag];
    if (sum > bestVal) { bestVal = sum; bestLag = lag; }
  }
  return bestLag / fps;
}

function peakInWindow(timeline, lo, hi) {
  let best = null;
  for (const p of timeline) {
    if (p.time < lo || p.time > hi) continue;
    if (!best || p.score > best.score) best = p;
  }
  return best;
}

function indexNearestTime(timeline, t) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < timeline.length; i++) {
    const d = Math.abs(timeline[i].time - t);
    if (d < bd) { bd = d; bi = i; }
  }
  return bi;
}

/**
 * Realistic bootstrap: start from ONLY the lap-1 mark, walk forward by lapTime,
 * pick the best flag match in a window (with a proximity bias toward the
 * expected time), then ADD that lap's ROI as a new reference for later laps.
 */
function bootstrapDetect(timeline, rois, anchorTime, lapTime, winS, prox, endTime, opts = {}) {
  const { adapt = true, fixedSchedule = false, promoteFirst = false } = opts;
  const ai = indexNearestTime(timeline, anchorTime);
  const anchorTimeSnapped = timeline[ai].time;
  let templates = [rois[ai]];
  const out = [{ time: anchorTimeSnapped, score: 1 }];
  let cur = anchorTimeSnapped;
  let k = 0;
  while (cur + lapTime - winS <= endTime) {
    k++;
    const exp = fixedSchedule ? anchorTimeSnapped + k * lapTime : cur + lapTime;
    let best = null;
    for (let i = 0; i < timeline.length; i++) {
      const t = timeline[i].time;
      if (t < exp - winS || t > exp + winS) continue;
      let s = -Infinity;
      for (const tp of templates) { const v = ncc(tp, rois[i]); if (v > s) s = v; }
      const adj = s - prox * Math.abs(t - exp);
      if (!best || adj > best.adj) best = { time: t, score: s, adj };
    }
    if (!best) break;
    out.push({ time: best.time, score: best.score });
    cur = best.time;
    const bestRoi = rois[indexNearestTime(timeline, best.time)];
    // Lap 1 is the atypical race start; once we have the first flying-lap start
    // (lap 2), promote it to be the visual reference and drop lap 1's looks.
    if (promoteFirst && k === 1) templates = [bestRoi];
    else if (adapt) templates.push(bestRoi);
  }
  return out;
}

/** Anchor on the first start, walk forward by lapTime, snap to best peak in a window. */
function periodicDetect(timeline, anchorTime, lapTime, winS, endTime) {
  const anchor = peakInWindow(timeline, anchorTime - 0.6, anchorTime + 0.6) ?? { time: anchorTime, score: 0 };
  const out = [anchor];
  let cur = anchor.time;
  while (cur + lapTime - winS <= endTime) {
    const exp = cur + lapTime;
    const best = peakInWindow(timeline, exp - winS, exp + winS);
    if (!best) break;
    out.push(best);
    cur = best.time;
  }
  return out;
}

function evaluate(detected, truth, tolS) {
  const usedTruth = new Set();
  const rows = [];
  for (const d of detected) {
    let bestIdx = -1, bestDelta = Infinity;
    for (let i = 0; i < truth.length; i++) {
      if (usedTruth.has(i)) continue;
      const delta = Math.abs(truth[i] - d.time);
      if (delta < bestDelta) { bestDelta = delta; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestDelta <= tolS) {
      usedTruth.add(bestIdx);
      rows.push({ time: d.time, score: d.score, truth: truth[bestIdx], delta: d.time - truth[bestIdx] });
    } else {
      rows.push({ time: d.time, score: d.score, truth: null, delta: null });
    }
  }
  const missed = truth.filter((_, i) => !usedTruth.has(i));
  return { rows, missed };
}

async function main() {
  const { session, starts } = loadSession(FILE_NAME);
  console.log(`Lap-start detection spike — ${session.fileName}`);
  console.log(`Video: ${session.sourcePath}`);
  console.log(`ROI (px): left=${ROI.left} top=${ROI.top} w=${ROI.width} h=${ROI.height}  (right ${((1 - roiFrac[0]) * 100).toFixed(0)}% of frame)`);
  console.log(`Scan: ${SCAN_FPS} fps | min gap: ${MIN_GAP_S}s | threshold: ${NCC_THRESHOLD} | ref laps: [${REF_LAPS.join(",")}]`);
  console.log(`Ground-truth lap starts: ${starts.length}\n`);

  const workDir = path.join(DATA_DIR, "cache", `lapstart-spike-${session.id}`);
  fs.mkdirSync(workDir, { recursive: true });

  // Build ROI template from reference lap(s)
  const refTemplates = [];
  for (const lapNo of REF_LAPS) {
    const t = starts[lapNo - 1];
    if (t == null) continue;
    const p = path.join(workDir, `ref-lap${lapNo}.png`);
    extractFrame(session.sourcePath, t, p);
    // save a cropped ROI preview
    await sharp(p).extract(ROI).toFile(path.join(workDir, `ref-lap${lapNo}-roi.png`));
    refTemplates.push(await loadRoiGray(p));
  }
  if (refTemplates.length === 0) throw new Error("No reference frames could be built");
  const MULTI = process.env.MULTI === "1";
  const template = refTemplates.length > 1 ? averageTemplates(refTemplates) : refTemplates[0];
  const scoreRoi = MULTI
    ? (roi) => Math.max(...refTemplates.map((t) => ncc(t, roi)))
    : (roi) => ncc(template, roi);
  console.log(`Scoring: ${MULTI ? `MAX over ${refTemplates.length} templates` : "single/averaged template"}`);
  console.log(`Template ROI preview: ${path.join(workDir, `ref-lap${REF_LAPS[0]}-roi.png`)}\n`);

  // Scan whole video (cached per fps so ROI/threshold tuning is fast)
  const scanDir = path.join(workDir, `scan-fps${SCAN_FPS}`);
  const frames = extractWholeVideo(session.sourcePath, scanDir);
  console.log(`Scanning ${frames.length} frames (cache: ${scanDir})...\n`);

  const BOOTSTRAP = process.env.BOOTSTRAP === "1";
  const timeline = [];
  const allRois = [];
  for (let i = 0; i < frames.length; i++) {
    const time = i / SCAN_FPS;
    const roi = await loadRoiGray(path.join(scanDir, frames[i]));
    if (BOOTSTRAP) allRois.push(roi);
    timeline.push({ time, score: scoreRoi(roi) });
  }

  // Diagnostic: best score achievable near each TRUE lap start (ignores threshold).
  console.log("Per-lap signal check (best NCC within ±1.5s of each true start):\n");
  console.log("Lap".padEnd(5) + "Truth".padEnd(12) + "BestNCC".padEnd(9) + "@time".padEnd(12) + "offset");
  console.log("-".repeat(46));
  const diagWin = 1.5;
  const bestNear = [];
  for (let i = 0; i < starts.length; i++) {
    const t = starts[i];
    let best = null;
    for (const p of timeline) {
      if (Math.abs(p.time - t) > diagWin) continue;
      if (!best || p.score > best.score) best = p;
    }
    bestNear.push(best?.score ?? null);
    console.log(
      String(i + 1).padEnd(5) +
        formatTime(t).padEnd(12) +
        (best ? best.score.toFixed(3) : "—").padEnd(9) +
        (best ? formatTime(best.time) : "—").padEnd(12) +
        (best ? `${(best.time - t >= 0 ? "+" : "")}${(best.time - t).toFixed(2)}s` : "—"),
    );
  }
  const valid = bestNear.filter((x) => x != null);
  console.log("-".repeat(46));
  console.log(
    `Signal range: min ${Math.min(...valid).toFixed(3)} | median ${valid.sort((a,b)=>a-b)[Math.floor(valid.length/2)].toFixed(3)} | max ${Math.max(...valid).toFixed(3)}\n`,
  );

  const PERIOD = process.env.PERIOD === "1";
  const endTime = (frames.length - 1) / SCAN_FPS;
  const autoPeriod = estimatePeriod(timeline, SCAN_FPS, 15, 45);
  const lapTime = process.env.LAP_TIME ? Number(process.env.LAP_TIME) : autoPeriod;
  const winS = Number(process.env.SEARCH_WIN ?? 5);
  const prox = Number(process.env.PROX ?? 0.03);
  const anchor = starts[0];
  let detected;
  if (BOOTSTRAP) {
    const adapt = process.env.NOADAPT !== "1";
    const fixedSchedule = process.env.FIXED === "1";
    const promoteFirst = process.env.PROMOTE === "1";
    console.log(`Bootstrap mode (1 mark): anchor ${formatTime(anchor)} | lap time ${lapTime.toFixed(2)}s (auto ${autoPeriod.toFixed(2)}s) | window ±${winS}s | prox ${prox}/s`);
    console.log(`Adaptive: ${adapt} | promote lap2 as template: ${promoteFirst} | schedule: ${fixedSchedule ? "fixed" : "cumulative"}\n`);
    detected = bootstrapDetect(timeline, allRois, anchor, lapTime, winS, prox, endTime, { adapt, fixedSchedule, promoteFirst });
  } else if (PERIOD) {
    console.log(`Periodic mode: anchor ${formatTime(anchor)} | lap time ${lapTime.toFixed(2)}s | search window ±${winS}s\n`);
    detected = periodicDetect(timeline, anchor, lapTime, winS, endTime);
  } else {
    detected = pickPeaks(timeline, NCC_THRESHOLD, MIN_GAP_S);
  }
  const { rows, missed } = evaluate(detected, starts, MATCH_TOL_S);

  console.log("Detected lap starts vs ground truth:\n");
  console.log("Detected".padEnd(12) + "NCC".padEnd(8) + "Truth".padEnd(12) + "Delta");
  console.log("-".repeat(44));
  for (const r of rows) {
    console.log(
      formatTime(r.time).padEnd(12) +
        r.score.toFixed(3).padEnd(8) +
        (r.truth != null ? formatTime(r.truth) : "— (false?)").padEnd(12) +
        (r.delta != null ? `${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(2)}s` : "—"),
    );
  }

  const matched = rows.filter((r) => r.truth != null);
  const falsePos = rows.filter((r) => r.truth == null);
  const deltas = matched.map((r) => Math.abs(r.delta));
  const meanAbs = deltas.length ? deltas.reduce((s, d) => s + d, 0) / deltas.length : null;
  const maxAbs = deltas.length ? Math.max(...deltas) : null;

  console.log("-".repeat(44));
  console.log(`\nMatched: ${matched.length}/${starts.length} truth laps`);
  console.log(`False positives: ${falsePos.length}`);
  console.log(`Missed: ${missed.length}${missed.length ? " @ " + missed.map(formatTime).join(", ") : ""}`);
  if (meanAbs != null) console.log(`Timing error (matched): mean ${meanAbs.toFixed(2)}s | max ${maxAbs.toFixed(2)}s`);
  console.log(`\nScore separation: matched-min ${matched.length ? Math.min(...matched.map(r=>r.score)).toFixed(3) : "—"} vs threshold ${NCC_THRESHOLD}`);
  console.log(`Work dir: ${workDir}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
