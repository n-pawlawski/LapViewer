import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import {
  DATA_DIR,
  DETECTION_FRAME_HEIGHT,
  DETECTION_FRAME_WIDTH,
  FFMPEG_PATH,
} from "../config.js";
import type { DetectionBankEntryDto, DetectionProfileDto, DetectionRoi } from "../types.js";
import {
  bestBankScore,
  estimatePeriod,
  periodicWalk,
  refineAnchor,
  type DetectionProposal,
} from "./lapDetectionMath.js";

export { ncc, estimatePeriod, periodicWalk, refineAnchor, bestBankScore } from "./lapDetectionMath.js";
export type { DetectionProposal, TimelinePoint, PeriodicWalkInput } from "./lapDetectionMath.js";

const DEFAULT_SEARCH_WINDOW_SEC = 2.5;
const DEFAULT_PROXIMITY = 0.05;
const DEFAULT_MIN_CONFIDENCE = 0.25;
const ANCHOR_REFINE_WINDOW_SEC = 0.6;

export interface RunDetectionInput {
  videoPath: string;
  sessionId: string;
  anchorTime: number;
  endTime?: number;
  profile: DetectionProfileDto;
  bank: DetectionBankEntryDto[];
  /** Last manually placed lap-start marker time, if any beyond anchor. */
  finalMarkerTime?: number;
  onProgress?: (progress: number) => void;
  isCancelled?: () => boolean;
}

export interface RunDetectionResult {
  proposals: DetectionProposal[];
  lapTimeMs: number;
}

function roiToPixels(roi: DetectionRoi) {
  return {
    left: Math.round(roi.x0 * DETECTION_FRAME_WIDTH),
    top: Math.round(roi.y0 * DETECTION_FRAME_HEIGHT),
    width: Math.round((roi.x1 - roi.x0) * DETECTION_FRAME_WIDTH),
    height: Math.round((roi.y1 - roi.y0) * DETECTION_FRAME_HEIGHT),
  };
}

function runFfmpeg(args: string[]): void {
  const result = spawnSync(FFMPEG_PATH, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed: ${result.stderr?.slice(-600) ?? result.error?.message ?? "unknown"}`,
    );
  }
}

export function extractFramePng(
  videoPath: string,
  timeSec: number,
  outPath: string,
): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(timeSec),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${DETECTION_FRAME_WIDTH}:${DETECTION_FRAME_HEIGHT}`,
    "-y",
    outPath,
  ]);
}

function extractScanFrames(
  videoPath: string,
  scanStart: number,
  duration: number,
  scanFps: number,
  outDir: string,
): string[] {
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
    videoPath,
    "-t",
    String(duration),
    "-vf",
    `fps=${scanFps},scale=${DETECTION_FRAME_WIDTH}:${DETECTION_FRAME_HEIGHT}`,
    "-y",
    path.join(outDir, "frame_%06d.png"),
  ]);
  return fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
}

export async function loadRoiGrayFromFile(
  filePath: string,
  roi: DetectionRoi,
): Promise<Uint8Array> {
  const extract = roiToPixels(roi);
  const { data } = await sharp(filePath)
    .extract(extract)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

export async function extractRoiGrayFromVideo(
  videoPath: string,
  timeSec: number,
  roi: DetectionRoi,
): Promise<Buffer> {
  const tmpDir = path.join(DATA_DIR, "cache", "bank-tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const framePath = path.join(tmpDir, `bank-${Date.now()}.png`);
  extractFramePng(videoPath, timeSec, framePath);
  try {
    const gray = await loadRoiGrayFromFile(framePath, roi);
    return Buffer.from(gray);
  } finally {
    fs.rmSync(framePath, { force: true });
  }
}

export async function renderFramePng(
  videoPath: string,
  timeSec: number,
  roi?: DetectionRoi,
): Promise<Buffer> {
  const tmpDir = path.join(DATA_DIR, "cache", "frame-tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const framePath = path.join(tmpDir, `frame-${Date.now()}.png`);
  extractFramePng(videoPath, timeSec, framePath);
  try {
    let pipeline = sharp(framePath);
    if (roi) {
      pipeline = pipeline.extract(roiToPixels(roi));
    }
    return await pipeline.png().toBuffer();
  } finally {
    fs.rmSync(framePath, { force: true });
  }
}

export async function loadFullFrameGrayFromFile(filePath: string): Promise<Uint8Array> {
  const { data } = await sharp(filePath).greyscale().raw().toBuffer({ resolveWithObject: true });
  return data;
}

export async function extractFullFrameGrayFromVideo(
  videoPath: string,
  timeSec: number,
): Promise<Buffer> {
  const tmpDir = path.join(DATA_DIR, "cache", "split-bank-tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const framePath = path.join(tmpDir, `split-bank-${Date.now()}.png`);
  extractFramePng(videoPath, timeSec, framePath);
  try {
    const gray = await loadFullFrameGrayFromFile(framePath);
    return Buffer.from(gray);
  } finally {
    fs.rmSync(framePath, { force: true });
  }
}

function scanCacheDir(sessionId: string, scanFps: number, scanStart: number): string {
  return path.join(
    DATA_DIR,
    "cache",
    sessionId,
    `lap-detect-fps${scanFps}-from${Math.round(scanStart)}`,
  );
}

export async function runDetection(input: RunDetectionInput): Promise<RunDetectionResult> {
  const { videoPath, sessionId, anchorTime, profile, bank, onProgress, isCancelled } = input;

  if (!profile.roi) {
    throw Object.assign(new Error("Detection profile has no ROI"), { code: "VALIDATION" });
  }

  const scanFps = profile.scanFps;
  const roi = profile.roi;
  const scanStart = Math.max(0, anchorTime - 12);
  const sessionEnd = input.endTime ?? Infinity;
  const scanEnd = Number.isFinite(sessionEnd) ? sessionEnd : undefined;

  onProgress?.(0.05);

  const bankTemplates: Uint8Array[] = bank.map((entry) => new Uint8Array(entry.roiGray));

  if (bankTemplates.length === 0) {
    const anchorPath = path.join(DATA_DIR, "cache", sessionId, "anchor-cold.png");
    extractFramePng(videoPath, anchorTime, anchorPath);
    bankTemplates.push(await loadRoiGrayFromFile(anchorPath, roi));
  }

  if (isCancelled?.()) {
    throw Object.assign(new Error("Detection cancelled"), { code: "CANCELLED" });
  }

  const scanDir = scanCacheDir(sessionId, scanFps, scanStart);
  const duration =
    scanEnd != null ? Math.max(0, scanEnd - scanStart) : 7200;

  onProgress?.(0.1);
  const frames = extractScanFrames(videoPath, scanStart, duration, scanFps, scanDir);
  if (frames.length === 0) {
    throw new Error("No frames extracted from video");
  }

  const times: number[] = [];
  const rois: Uint8Array[] = [];
  const scores: number[] = [];

  for (let i = 0; i < frames.length; i++) {
    if (isCancelled?.()) {
      throw Object.assign(new Error("Detection cancelled"), { code: "CANCELLED" });
    }
    const t = scanStart + i / scanFps;
    const gray = await loadRoiGrayFromFile(path.join(scanDir, frames[i]!), roi);
    times.push(t);
    rois.push(gray);
    scores.push(bestBankScore(gray, bankTemplates));
    onProgress?.(0.1 + (0.75 * (i + 1)) / frames.length);
  }

  const endTime = Math.min(times[times.length - 1]!, sessionEnd);
  const lapTimeSec =
    profile.lapTimePriorMs != null
      ? profile.lapTimePriorMs / 1000
      : estimatePeriod(scores, scanFps, 15, 60);

  const anchorRefined = refineAnchor(times, scores, anchorTime, ANCHOR_REFINE_WINDOW_SEC);

  onProgress?.(0.9);

  const proposals = periodicWalk({
    times,
    rois,
    bankTemplates,
    anchorTime: anchorRefined.time,
    lapTimeSec,
    searchWindowSec: DEFAULT_SEARCH_WINDOW_SEC,
    proximityWeight: DEFAULT_PROXIMITY,
    endTime,
    finalMarkerTime: input.finalMarkerTime,
    minConfidence: DEFAULT_MIN_CONFIDENCE,
  });

  onProgress?.(1);

  return {
    proposals,
    lapTimeMs: Math.round(lapTimeSec * 1000),
  };
}
