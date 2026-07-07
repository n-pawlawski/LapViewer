/**
 * GoPro progress-curve spike — validates timestampMs → trackProgress (Phase 3B gate).
 *
 * Builds reference points from lap 1, matches lap 2 frame-by-frame, runs greedy
 * sequence alignment, and reports go/no-go metrics.
 *
 * Read-only: does NOT modify the database.
 *
 * Usage:
 *   npx tsx server/scripts/gopro-progress-spike.mjs [fileName]
 *
 * Env:
 *   FFMPEG_PATH          HEVC-capable ffmpeg
 *   SCAN_FPS             sample rate (default 5)
 *   REF_LAP              1-based reference lap index (default 1)
 *   TARGET_LAP           1-based target lap index (default 2)
 *   ANCHOR_S             first lap-start hint when auto-detecting bounds (default 100)
 *   AUTO_LAPS            1 = detect lap starts when DB has no markers (default 1)
 *   REF_START/REF_END    override reference lap bounds (seconds)
 *   TARGET_START/TARGET_END  override target lap bounds (seconds)
 *   CROP                 "top,bottom,left,right" fractions (default "0.15,0.20,0,0")
 *   PROGRESS_TOL         top-5 hit tolerance on progress (default 0.08)
 *
 * Go gate (see docs/features/GOPRO_LAP_SPLIT_DETECTION.md):
 *   - top5HitRate >= 0.70
 *   - monotonicityViolationRate <= 0.10
 *   - wraps only near SF (wrap count reasonable vs lap count)
 *
 * Output: data/cache/gopro-progress-spike-{sessionId}.json
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
const REF_LAP = Number(process.env.REF_LAP ?? 1);
const TARGET_LAP = Number(process.env.TARGET_LAP ?? 2);
const AUTO_LAPS = process.env.AUTO_LAPS !== "0";
const ANCHOR_S = Number(process.env.ANCHOR_S ?? 100);
const PROGRESS_TOL = Number(process.env.PROGRESS_TOL ?? 0.08);
const TOP_N = 5;

const MIN_LAP_TIME_MS = 25_000;
const MAX_PROGRESS_JUMP_PER_SECOND = 0.12;
const WRAP_START_THRESHOLD = 0.9;
const WRAP_END_THRESHOLD = 0.1;

const cropParts = (process.env.CROP ?? "0.15,0.20,0,0").split(",").map(Number);
const CROP = {
  top: cropParts[0] ?? 0.15,
  bottom: cropParts[1] ?? 0.2,
  left: cropParts[2] ?? 0,
  right: cropParts[3] ?? 0,
};

const FLAG_ROI_FRAC = (process.env.FLAG_ROI ?? "0.54,0.27,1.0,0.63").split(",").map(Number);
const FLAG_ROI = {
  left: Math.round(FLAG_ROI_FRAC[0] * WIDTH),
  top: Math.round(FLAG_ROI_FRAC[1] * HEIGHT),
  width: Math.round((FLAG_ROI_FRAC[2] - FLAG_ROI_FRAC[0]) * WIDTH),
  height: Math.round((FLAG_ROI_FRAC[3] - FLAG_ROI_FRAC[1]) * HEIGHT),
};

const TRACK_CROP = {
  left: Math.round(CROP.left * WIDTH),
  top: Math.round(CROP.top * HEIGHT),
  width: Math.round((1 - CROP.left - CROP.right) * WIDTH),
  height: Math.round((1 - CROP.top - CROP.bottom) * HEIGHT),
};

function loadSession(fileName) {
  const db = new Database(path.join(DATA_DIR, "lapviewer.db"), { readonly: true });
  const session = db
    .prepare(
      `SELECT id, fileName, sourcePath, trackName, durationSeconds FROM sessions
       WHERE fileName = ? ORDER BY datetime(createdAt) DESC LIMIT 1`,
    )
    .get(fileName);
  if (!session) {
    db.close();
    throw new Error(`No session for ${fileName}`);
  }
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

function extractScanRange(video, scanStart, duration, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const existing = fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
  if (existing.length > 0) return existing;
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(scanStart),
    "-i",
    video,
    "-t",
    String(duration),
    "-vf",
    `fps=${SCAN_FPS},scale=${WIDTH}:${HEIGHT}`,
    "-y",
    path.join(outDir, "frame_%06d.png"),
  ]);
  return fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
}

async function loadTrackGray(filePath) {
  const { data } = await sharp(filePath)
    .extract(TRACK_CROP)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

async function loadFlagGray(filePath) {
  const { data } = await sharp(filePath)
    .extract(FLAG_ROI)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

function ncc(a, b) {
  if (a.length !== b.length || a.length === 0) return -1;
  let sA = 0;
  let sB = 0;
  let sAB = 0;
  let sAB2 = 0;
  let sB2 = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    sA += a[i];
    sB += b[i];
    sAB += a[i] * b[i];
    sAB2 += a[i] * a[i];
    sB2 += b[i] * b[i];
  }
  const num = n * sAB - sA * sB;
  const den = Math.sqrt((n * sAB2 - sA * sA) * (n * sB2 - sB * sB));
  return den === 0 ? 0 : num / den;
}

function estimatePeriod(scores, fps, minPeriodSec = 15, maxPeriodSec = 60) {
  if (scores.length < 2) return minPeriodSec;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const centered = scores.map((v) => v - mean);
  let bestLag = -1;
  let bestVal = -Infinity;
  const minLag = Math.round(minPeriodSec * fps);
  const maxLag = Math.min(Math.round(maxPeriodSec * fps), centered.length - 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < centered.length; i++) {
      sum += centered[i] * centered[i + lag];
    }
    if (sum > bestVal) {
      bestVal = sum;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? bestLag / fps : minPeriodSec;
}

function indexNearestTime(times, t) {
  let bestIndex = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < times.length; i++) {
    const delta = Math.abs(times[i] - t);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Detect lap-start times using flag ROI + bootstrap (when DB has no markers). */
async function autoDetectLapStarts(videoPath, workDir, endTime) {
  const scanStart = Math.max(0, ANCHOR_S - 15);
  const scanDir = path.join(workDir, "auto-lap-scan");
  const frames = extractScanRange(videoPath, scanStart, endTime - scanStart + 5, scanDir);
  const times = frames.map((_, i) => scanStart + i / SCAN_FPS);
  const rois = [];
  const scores = [];
  for (let i = 0; i < frames.length; i++) {
    const gray = await loadFlagGray(path.join(scanDir, frames[i]));
    rois.push(gray);
    scores.push(0);
  }
  const anchorIdx = indexNearestTime(times, ANCHOR_S);
  const template = rois[anchorIdx];
  for (let i = 0; i < rois.length; i++) {
    scores[i] = ncc(template, rois[i]);
  }
  const lapTime = estimatePeriod(scores, SCAN_FPS, 15, 45);
  const winS = Number(process.env.SEARCH_WIN ?? 2.5);
  const prox = Number(process.env.PROX ?? 0.05);
  const anchorTime = times[anchorIdx];
  const out = [anchorTime];
  let cur = anchorTime;
  while (cur + lapTime - winS <= endTime) {
    const expected = cur + lapTime;
    let best = null;
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (t < expected - winS || t > expected + winS) continue;
      const score = ncc(template, rois[i]);
      const adj = score - prox * Math.abs(t - expected);
      if (!best || adj > best.adj) best = { time: t, adj, score };
    }
    if (!best || best.score < 0.25) break;
    out.push(best.time);
    cur = best.time;
  }
  console.log(
    `Auto-detected ${out.length} lap starts (anchor ${ANCHOR_S}s, lapTime ${lapTime.toFixed(1)}s):`,
    out.map((t) => t.toFixed(1)).join(", "),
  );
  return out;
}

function resolveLapBounds(session, starts, workDir, endTime) {
  if (process.env.REF_START != null && process.env.REF_END != null) {
    return {
      refStart: Number(process.env.REF_START),
      refEnd: Number(process.env.REF_END),
      targetStart: Number(process.env.TARGET_START ?? process.env.REF_END),
      targetEnd: Number(
        process.env.TARGET_END ??
          Number(process.env.TARGET_START ?? process.env.REF_END) +
            (Number(process.env.REF_END) - Number(process.env.REF_START)),
      ),
      starts,
    };
  }

  let lapStarts = starts;
  if (lapStarts.length < TARGET_LAP + 1) {
    if (!AUTO_LAPS) {
      throw new Error(
        `Need ${TARGET_LAP + 1} lap-start markers (have ${lapStarts.length}). ` +
          `Set AUTO_LAPS=1 or REF_START/REF_END/TARGET_START/TARGET_END.`,
      );
    }
    return null;
  }

  const refStart = lapStarts[REF_LAP - 1];
  const refEnd = lapStarts[REF_LAP];
  const targetStart = lapStarts[TARGET_LAP - 1];
  const targetEnd =
    lapStarts[TARGET_LAP] ?? targetStart + (refEnd - refStart);
  return { refStart, refEnd, targetStart, targetEnd, starts: lapStarts };
}

async function buildReferencePoints(videoPath, refStart, refEnd, workDir) {
  const scanDir = path.join(workDir, "ref-scan");
  const duration = refEnd - refStart;
  const frames = extractScanRange(videoPath, refStart, duration, scanDir);
  const refDurationMs = duration * 1000;
  const points = [];
  for (let i = 0; i < frames.length; i++) {
    const timeSec = refStart + i / SCAN_FPS;
    if (timeSec >= refEnd) break;
    const timestampMs = Math.round(timeSec * 1000);
    const progress = Math.min(1, Math.max(0, ((timeSec - refStart) / duration)));
    const gray = await loadTrackGray(path.join(scanDir, frames[i]));
    points.push({ timestampMs, progress, gray });
  }
  console.log(`Reference points: ${points.length} (lap ${REF_LAP}, ${refStart.toFixed(1)}s–${refEnd.toFixed(1)}s)`);
  return { points, refDurationMs };
}

function rankCandidates(queryGray, refPoints, topN = 10) {
  return refPoints
    .map((ref) => ({
      progress: ref.progress,
      visualScore: ncc(queryGray, ref.gray),
    }))
    .sort((a, b) => b.visualScore - a.visualScore)
    .slice(0, topN);
}

function sequencePenalty(previous, candidate, dtSec) {
  if (!previous) return 0;
  const prevP = previous.progress;
  const candP = candidate.progress;
  if (prevP > WRAP_START_THRESHOLD && candP < WRAP_END_THRESHOLD) return 0;
  if (candP < prevP - 0.02) return 1.0;
  const maxJump = MAX_PROGRESS_JUMP_PER_SECOND * dtSec + 0.03;
  if (candP - prevP > maxJump) return 0.6 * (candP - prevP - maxJump);
  return 0;
}

function greedySequenceAlign(frames, candidateLists) {
  const selected = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const previous = selected[selected.length - 1];
    const dtSec =
      previous != null
        ? (frame.timestampMs - selected[selected.length - 1].timestampMs) / 1000
        : 1 / SCAN_FPS;
    const ranked = candidateLists[i]
      .map((candidate) => ({
        ...candidate,
        sequenceScore: candidate.visualScore - sequencePenalty(previous, candidate, dtSec),
      }))
      .sort((a, b) => b.sequenceScore - a.sequenceScore);
    const best = ranked[0];
    selected.push({
      timestampMs: frame.timestampMs,
      timeSec: frame.timeSec,
      estimatedProgress: best.progress,
      confidence: best.sequenceScore,
      visualScore: best.visualScore,
      topCandidates: ranked.slice(0, TOP_N),
    });
  }
  return selected;
}

function truthProgress(timeSec, targetStart, targetEnd) {
  const duration = targetEnd - targetStart;
  if (duration <= 0) return 0;
  return Math.min(1, Math.max(0, (timeSec - targetStart) / duration));
}

function evaluate(selected, targetStart, targetEnd) {
  let top5Hits = 0;
  let monotonicityViolations = 0;
  let wraps = 0;

  for (let i = 0; i < selected.length; i++) {
    const row = selected[i];
    const truth = truthProgress(row.timeSec, targetStart, targetEnd);
    const hit = row.topCandidates.some(
      (c) => Math.abs(c.progress - truth) <= PROGRESS_TOL,
    );
    if (hit) top5Hits++;

    if (i > 0) {
      const prev = selected[i - 1];
      const dp = row.estimatedProgress - prev.estimatedProgress;
      const isWrap =
        prev.estimatedProgress > WRAP_START_THRESHOLD &&
        row.estimatedProgress < WRAP_END_THRESHOLD;
      if (isWrap) wraps++;
      else if (dp < -0.02) monotonicityViolations++;
    }
  }

  const frameCount = selected.length;
  const top5HitRate = frameCount ? top5Hits / frameCount : 0;
  const monotonicityViolationRate = frameCount > 1 ? monotonicityViolations / (frameCount - 1) : 0;

  const goGate = {
    top5HitRateMin: 0.7,
    monotonicityViolationRateMax: 0.1,
  };
  const passed =
    top5HitRate >= goGate.top5HitRateMin &&
    monotonicityViolationRate <= goGate.monotonicityViolationRateMax;

  return {
    top5Hits,
    frameCount,
    top5HitRate,
    monotonicityViolations,
    monotonicityViolationRate,
    wraps,
    goGate,
    passed,
    verdict: passed ? "GO" : "NO-GO",
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  return `${m}:${s.padStart(5, "0")}`;
}

async function main() {
  const { session, starts } = loadSession(FILE_NAME);
  const endTime = session.durationSeconds ?? 300;
  const workDir = path.join(DATA_DIR, "cache", `gopro-progress-spike-${session.id}`);
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`GoPro progress-curve spike — ${session.fileName}`);
  console.log(`Video: ${session.sourcePath}`);
  console.log(`Track crop: top=${CROP.top} bottom=${CROP.bottom} (${TRACK_CROP.width}x${TRACK_CROP.height}px)`);
  console.log(`Scan: ${SCAN_FPS} fps | ref lap ${REF_LAP} → target lap ${TARGET_LAP}\n`);

  let bounds = resolveLapBounds(session, starts, workDir, endTime);
  if (!bounds) {
    const detected = await autoDetectLapStarts(session.sourcePath, workDir, endTime);
    bounds = resolveLapBounds(session, detected, workDir, endTime);
    if (!bounds) {
      throw new Error(
        `Auto-detect found ${detected.length} starts; need at least ${TARGET_LAP + 1}. ` +
          `Tune ANCHOR_S or set REF_START/REF_END/TARGET_START/TARGET_END.`,
      );
    }
  }

  const { refStart, refEnd, targetStart, targetEnd } = bounds;
  console.log(
    `Reference lap: ${formatTime(refStart)} – ${formatTime(refEnd)} | ` +
      `Target lap: ${formatTime(targetStart)} – ${formatTime(targetEnd)}\n`,
  );

  const { points: refPoints } = await buildReferencePoints(
    session.sourcePath,
    refStart,
    refEnd,
    workDir,
  );

  const targetScanDir = path.join(workDir, "target-scan");
  const targetDuration = targetEnd - targetStart;
  const targetFrames = extractScanRange(
    session.sourcePath,
    targetStart,
    targetDuration,
    targetScanDir,
  );

  const frames = [];
  const candidateLists = [];
  console.log(`Matching ${targetFrames.length} target frames...`);
  for (let i = 0; i < targetFrames.length; i++) {
    const timeSec = targetStart + i / SCAN_FPS;
    if (timeSec >= targetEnd) break;
    const gray = await loadTrackGray(path.join(targetScanDir, targetFrames[i]));
    frames.push({ timestampMs: Math.round(timeSec * 1000), timeSec });
    candidateLists.push(rankCandidates(gray, refPoints));
  }

  const curve = greedySequenceAlign(frames, candidateLists);
  const metrics = evaluate(curve, targetStart, targetEnd);

  const output = {
    sessionId: session.id,
    fileName: session.fileName,
    generatedAt: new Date().toISOString(),
    config: {
      scanFps: SCAN_FPS,
      refLap: REF_LAP,
      targetLap: TARGET_LAP,
      crop: CROP,
      progressTol: PROGRESS_TOL,
      sequence: {
        minLapTimeMs: MIN_LAP_TIME_MS,
        maxProgressJumpPerSecond: MAX_PROGRESS_JUMP_PER_SECOND,
        wrapStartThreshold: WRAP_START_THRESHOLD,
        wrapEndThreshold: WRAP_END_THRESHOLD,
      },
    },
    bounds: { refStart, refEnd, targetStart, targetEnd },
    metrics,
    curveSamples: curve.map((row) => ({
      timestampMs: row.timestampMs,
      timeSec: row.timeSec,
      estimatedProgress: row.estimatedProgress,
      confidence: row.confidence,
      visualScore: row.visualScore,
      truthProgress: truthProgress(row.timeSec, targetStart, targetEnd),
    })),
  };

  const outPath = path.join(DATA_DIR, "cache", `gopro-progress-spike-${session.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log("\n--- Go / no-go metrics ---");
  console.log(`Top-5 hit rate: ${(metrics.top5HitRate * 100).toFixed(1)}% (gate ≥ ${metrics.goGate.top5HitRateMin * 100}%)`);
  console.log(
    `Monotonicity violations: ${metrics.monotonicityViolations}/${metrics.frameCount - 1} ` +
      `(${(metrics.monotonicityViolationRate * 100).toFixed(1)}%, gate ≤ ${metrics.goGate.monotonicityViolationRateMax * 100}%)`,
  );
  console.log(`Progress wraps (>${WRAP_START_THRESHOLD}→<${WRAP_END_THRESHOLD}): ${metrics.wraps}`);
  console.log(`\nVerdict: ${metrics.verdict}`);
  console.log(`Output: ${outPath}`);
  console.log(`Work dir: ${workDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
