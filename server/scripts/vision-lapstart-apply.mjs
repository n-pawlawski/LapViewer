/**
 * Apply lap-start detection to a target session using a per-track template BANK
 * built from a reference session's manually-confirmed lap starts (warm start),
 * or a session-local template at the anchor (cold start).
 *
 * Diagnostic by default; set INSERT=1 to write lapStart markers to the DB.
 *
 * Usage: node scripts/vision-lapstart-apply.mjs <targetFile> [refFile]
 * Env:
 *   ROI          "x0,y0,x1,y1" fractions (default "0.54,0.27,1.0,0.63")
 *   ANCHOR_S     approx first lap-start time in target, seconds (required)
 *   SCAN_START   seconds to begin scanning target (default ANCHOR_S - 12)
 *   SCAN_FPS     sample rate (default 5)
 *   LAP_TIME     override lap time; else autocorrelation
 *   SEARCH_WIN   ± window around expected start (default 2.5)
 *   PROX         proximity penalty per second (default 0.05)
 *   FIXED        1 = schedule anchor+k*lap; else cumulative resync
 *   COLD         1 = ignore bank, use target anchor ROI as sole template
 *   INSERT       1 = write markers to DB
 *   FFMPEG_PATH  ffmpeg (HEVC-capable)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "lapviewer.db");
const FFMPEG =
  process.env.FFMPEG_PATH ?? "C:\\Program Files\\CleverGet\\CleverGet\\ffmpeg.exe";

const TARGET_FILE = process.argv[2] ?? "GX010022.MP4";
const REF_FILE = process.argv[3] ?? "GX010012.MP4";

const WIDTH = 320;
const HEIGHT = 180;
const SCAN_FPS = Number(process.env.SCAN_FPS ?? 5);
const SEARCH_WIN = Number(process.env.SEARCH_WIN ?? 2.5);
const PROX = Number(process.env.PROX ?? 0.05);
const FIXED = process.env.FIXED === "1";
const COLD = process.env.COLD === "1";
const INSERT = process.env.INSERT === "1";
const ANCHOR_S = process.env.ANCHOR_S ? Number(process.env.ANCHOR_S) : null;

const roiFrac = (process.env.ROI ?? "0.54,0.27,1.0,0.63").split(",").map(Number);
const ROI = {
  left: Math.round(roiFrac[0] * WIDTH),
  top: Math.round(roiFrac[1] * HEIGHT),
  width: Math.round((roiFrac[2] - roiFrac[0]) * WIDTH),
  height: Math.round((roiFrac[3] - roiFrac[1]) * HEIGHT),
};

function db() {
  return new Database(DB_PATH, { readonly: !INSERT });
}

function latestSession(database, fileName) {
  return database
    .prepare(
      `SELECT id, fileName, sourcePath, trackName, durationSeconds FROM sessions
       WHERE fileName = ? ORDER BY datetime(createdAt) DESC LIMIT 1`,
    )
    .get(fileName);
}

function lapStarts(database, sessionId) {
  return database
    .prepare(
      `SELECT timeSeconds FROM markers WHERE sessionId = ? AND kind = 'lapStart' ORDER BY timeSeconds`,
    )
    .all(sessionId)
    .map((r) => r.timeSeconds);
}

function runFfmpeg(args) {
  const r = spawnSync(FFMPEG, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr?.slice(-500) ?? r.error}`);
}

function extractFrame(video, timeS, outPath) {
  runFfmpeg(["-hide_banner", "-loglevel", "error", "-ss", String(timeS), "-i", video,
    "-frames:v", "1", "-vf", `scale=${WIDTH}:${HEIGHT}`, "-y", outPath]);
}

function extractRange(video, start, duration, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const existing = fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
  if (existing.length > 0) return existing;
  runFfmpeg(["-hide_banner", "-loglevel", "error", "-ss", String(start), "-i", video,
    "-t", String(duration), "-vf", `fps=${SCAN_FPS},scale=${WIDTH}:${HEIGHT}`,
    "-y", path.join(outDir, "frame_%06d.png")]);
  return fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
}

async function roiGray(filePath) {
  const { data } = await sharp(filePath).extract(ROI).greyscale().raw().toBuffer({ resolveWithObject: true });
  return data;
}

function ncc(a, b) {
  if (a.length !== b.length) return -1;
  let sA = 0, sB = 0, sAB = 0, sA2 = 0, sB2 = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) { sA += a[i]; sB += b[i]; sAB += a[i]*b[i]; sA2 += a[i]*a[i]; sB2 += b[i]*b[i]; }
  const num = n*sAB - sA*sB;
  const den = Math.sqrt((n*sA2 - sA*sA) * (n*sB2 - sB*sB));
  return den === 0 ? 0 : num/den;
}

function estimatePeriod(scores, fps, minP, maxP) {
  const mean = scores.reduce((a,b)=>a+b,0)/scores.length;
  const c = scores.map((v)=>v-mean);
  let bestLag = -1, bestVal = -Infinity;
  for (let lag = Math.round(minP*fps); lag <= Math.round(maxP*fps); lag++) {
    let sum = 0;
    for (let i = 0; i + lag < c.length; i++) sum += c[i]*c[i+lag];
    if (sum > bestVal) { bestVal = sum; bestLag = lag; }
  }
  return bestLag / fps;
}

function formatTime(s) {
  const m = Math.floor(s/60);
  const sec = (s%60).toFixed(2);
  return `${m}:${sec.padStart(5,"0")}`;
}

function idxNearest(times, t) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < times.length; i++) { const d = Math.abs(times[i]-t); if (d<bd){bd=d;bi=i;} }
  return bi;
}

async function main() {
  const database = db();
  const target = latestSession(database, TARGET_FILE);
  if (!target) throw new Error(`No session for ${TARGET_FILE}`);
  const ref = latestSession(database, REF_FILE);
  if (!ref && !COLD) throw new Error(`No reference session for ${REF_FILE}`);

  if (ANCHOR_S == null) throw new Error("ANCHOR_S (approx first lap-start seconds) is required");

  console.log(`Apply lap-start detection`);
  console.log(`Target: ${target.fileName} (track ${target.trackName}) — ${target.sourcePath}`);
  console.log(`Reference bank: ${COLD ? "(cold: session-local)" : `${ref.fileName} (track ${ref.trackName})`}`);
  console.log(`ROI px: left=${ROI.left} top=${ROI.top} w=${ROI.width} h=${ROI.height}`);
  console.log(`Anchor ~${formatTime(ANCHOR_S)} | window ±${SEARCH_WIN}s | prox ${PROX}/s | schedule ${FIXED ? "fixed" : "cumulative"} | insert ${INSERT}\n`);

  const workDir = path.join(DATA_DIR, "cache", `lapstart-apply-${target.id}`);
  fs.mkdirSync(workDir, { recursive: true });

  // Build bank
  const bank = [];
  if (COLD) {
    const p = path.join(workDir, "anchor.png");
    extractFrame(target.sourcePath, ANCHOR_S, p);
    bank.push(await roiGray(p));
  } else {
    const refStarts = lapStarts(database, ref.id);
    console.log(`Bank: ${refStarts.length} confirmed starts from ${ref.fileName}`);
    const bankDir = path.join(DATA_DIR, "cache", `lapstart-bank-${ref.id}`);
    fs.mkdirSync(bankDir, { recursive: true });
    for (let i = 0; i < refStarts.length; i++) {
      const p = path.join(bankDir, `bank-${i}.png`);
      if (!fs.existsSync(p)) extractFrame(ref.sourcePath, refStarts[i], p);
      bank.push(await roiGray(p));
    }
  }

  // Scan target racing portion
  const scanStart = process.env.SCAN_START ? Number(process.env.SCAN_START) : Math.max(0, ANCHOR_S - 12);
  const duration = (target.durationSeconds ?? 0) - scanStart;
  const scanDir = path.join(workDir, `scan-fps${SCAN_FPS}-from${Math.round(scanStart)}`);
  const frames = extractRange(target.sourcePath, scanStart, duration, scanDir);
  console.log(`Scanning ${frames.length} frames from ${formatTime(scanStart)} (cache: ${scanDir})\n`);

  const times = [];
  const rois = [];
  const scores = [];
  for (let i = 0; i < frames.length; i++) {
    const t = scanStart + i / SCAN_FPS;
    const g = await roiGray(path.join(scanDir, frames[i]));
    let s = -Infinity;
    for (const b of bank) { const v = ncc(b, g); if (v > s) s = v; }
    times.push(t); rois.push(g); scores.push(s);
  }

  const lapTime = process.env.LAP_TIME ? Number(process.env.LAP_TIME) : estimatePeriod(scores, SCAN_FPS, 15, 45);
  console.log(`Lap time: ${lapTime.toFixed(2)}s ${process.env.LAP_TIME ? "(override)" : "(autocorrelation)"}`);
  console.log(`Bank match score across scan: min ${Math.min(...scores).toFixed(3)} | max ${Math.max(...scores).toFixed(3)} | mean ${(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(3)}\n`);

  // Refine anchor to best bank match within ±3s
  let aBest = null;
  for (let i = 0; i < times.length; i++) {
    if (Math.abs(times[i] - ANCHOR_S) > 3) continue;
    if (!aBest || scores[i] > aBest.score) aBest = { time: times[i], score: scores[i] };
  }
  const anchorTime = aBest?.time ?? ANCHOR_S;
  console.log(`Anchor refined to ${formatTime(anchorTime)} (bank score ${aBest?.score.toFixed(3) ?? "—"})\n`);

  // Walk forward
  const endTime = times[times.length - 1];
  const templates = [...bank];
  const detected = [{ time: anchorTime, score: aBest?.score ?? 0 }];
  let cur = anchorTime;
  let k = 0;
  while (cur + lapTime - SEARCH_WIN <= endTime) {
    k++;
    const exp = FIXED ? anchorTime + k * lapTime : cur + lapTime;
    let best = null;
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (t < exp - SEARCH_WIN || t > exp + SEARCH_WIN) continue;
      let s = -Infinity;
      for (const tp of templates) { const v = ncc(tp, rois[i]); if (v > s) s = v; }
      const adj = s - PROX * Math.abs(t - exp);
      if (!best || adj > best.adj) best = { time: t, score: s, adj };
    }
    if (!best) break;
    detected.push({ time: best.time, score: best.score });
    cur = best.time;
  }

  console.log(`Detected ${detected.length} lap starts:\n`);
  console.log("Lap".padEnd(5) + "Time".padEnd(12) + "Score".padEnd(9) + "Gap");
  console.log("-".repeat(34));
  for (let i = 0; i < detected.length; i++) {
    const gap = i > 0 ? detected[i].time - detected[i-1].time : 0;
    console.log(String(i+1).padEnd(5) + formatTime(detected[i].time).padEnd(12) +
      detected[i].score.toFixed(3).padEnd(9) + (i>0 ? `${gap.toFixed(2)}s` : "—"));
  }

  // Save detected-frame thumbnails for eyeball review
  const shotDir = path.join(workDir, "detected");
  fs.rmSync(shotDir, { recursive: true, force: true });
  fs.mkdirSync(shotDir, { recursive: true });
  for (let i = 0; i < detected.length; i++) {
    extractFrame(target.sourcePath, detected[i].time, path.join(shotDir, `lap${String(i+1).padStart(2,"0")}_${detected[i].time.toFixed(2)}.png`));
  }
  console.log(`\nDetected-frame thumbnails: ${shotDir}`);

  if (INSERT) {
    database.close();
    const { initDatabase } = await import("../src/db/database.js");
    const { insertMarker, getSessionById } = await import("../src/services/sessions.js");
    initDatabase();
    for (const d of detected) insertMarker(target.id, d.time, { kind: "lapStart" });
    const final = getSessionById(target.id);
    console.log(`\nInserted ${detected.length} lapStart markers. Session now has ${final?.laps?.length ?? 0} lap(s).`);
  } else {
    database.close();
    console.log(`\n(Diagnostic only — set INSERT=1 to write markers.)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
