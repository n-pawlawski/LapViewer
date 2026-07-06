import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  DATA_DIR,
  DETECTION_FRAME_HEIGHT,
  DETECTION_FRAME_WIDTH,
  FFMPEG_PATH,
} from "../config.js";
import { loadFullFrameGrayFromFile } from "./lapDetection.js";
import {
  buildSplitDetectionProposals,
  type SplitDetectionProposal,
} from "./splitDetectionMath.js";
import {
  listSplitBankTemplates,
  medianLapOffsetForSplit,
} from "./splitBank.js";

const DEFAULT_SCAN_FPS = 5;
const MIN_NCC = 0.35;

function runFfmpeg(args: string[]): void {
  const result = spawnSync(FFMPEG_PATH, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed: ${result.stderr?.slice(-600) ?? result.error?.message ?? "unknown"}`,
    );
  }
}

function extractScanFrames(
  videoPath: string,
  scanStart: number,
  duration: number,
  scanFps: number,
  outDir: string,
): string[] {
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(outDir)) {
    if (file.endsWith(".png")) fs.rmSync(path.join(outDir, file), { force: true });
  }

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

export interface RunSplitDetectionInput {
  videoPath: string;
  sessionId: string;
  trackId: string;
  lapStartSec: number;
  lapEndSec: number;
  missingSplitIndices: number[];
  onProgress?: (progress: number) => void;
  isCancelled?: () => boolean;
}

export interface RunSplitDetectionResult {
  proposals: SplitDetectionProposal[];
}

export async function runSplitDetection(
  input: RunSplitDetectionInput,
): Promise<RunSplitDetectionResult> {
  const {
    videoPath,
    sessionId,
    trackId,
    lapStartSec,
    lapEndSec,
    missingSplitIndices,
    onProgress,
    isCancelled,
  } = input;

  if (missingSplitIndices.length === 0) {
    return { proposals: [] };
  }

  const scanFps = DEFAULT_SCAN_FPS;
  const scanStart = Math.max(0, lapStartSec - 0.25);
  const scanEnd = lapEndSec;
  const duration = Math.max(0.5, scanEnd - scanStart);

  const scanDir = path.join(
    DATA_DIR,
    "cache",
    sessionId,
    `split-detect-lap-${Math.round(lapStartSec)}-fps${scanFps}`,
  );

  onProgress?.(0.05);
  const frames = extractScanFrames(videoPath, scanStart, duration, scanFps, scanDir);
  if (frames.length === 0) {
    throw new Error("No frames extracted from video");
  }

  const frameTimes: number[] = [];
  const frameGrays: Uint8Array[] = [];

  for (let i = 0; i < frames.length; i++) {
    if (isCancelled?.()) {
      throw Object.assign(new Error("Split detection cancelled"), { code: "CANCELLED" });
    }
    const timeSec = scanStart + i / scanFps;
    if (timeSec > scanEnd) break;
    frameTimes.push(timeSec);
    frameGrays.push(await loadFullFrameGrayFromFile(path.join(scanDir, frames[i]!)));
    onProgress?.(0.05 + (0.7 * (i + 1)) / frames.length);
  }

  const bankBySplitIndex = new Map<number, Uint8Array[]>();
  const medianOffsetBySplitIndex = new Map<number, number>();

  for (const splitIndex of missingSplitIndices) {
    bankBySplitIndex.set(splitIndex, listSplitBankTemplates(trackId, splitIndex));
    const medianOffset = medianLapOffsetForSplit(trackId, splitIndex);
    if (medianOffset != null) {
      medianOffsetBySplitIndex.set(splitIndex, medianOffset);
    }
  }

  onProgress?.(0.85);

  const proposals = buildSplitDetectionProposals({
    missingSplitIndices: [...missingSplitIndices].sort((a, b) => a - b),
    frameTimes,
    frameGrays,
    bankBySplitIndex,
    medianOffsetBySplitIndex,
    lapStartSec,
    lapEndSec: scanEnd,
    minNcc: MIN_NCC,
  });

  onProgress?.(1);
  return { proposals };
}
