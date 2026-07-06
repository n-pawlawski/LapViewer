import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import {
  DATA_DIR,
  DETECTION_FRAME_HEIGHT,
  DETECTION_FRAME_WIDTH,
  FFMPEG_PATH,
} from "../config.js";
import { getDb } from "../db/database.js";
import type { ReferenceProfileCrop, ReferenceProfileDto } from "../types.js";
import {
  detectLapStartProposals,
  detectLowConfidenceRanges,
  detectSplitCrossingProposals,
  detectSplitCrossingProposalsPerLap,
  buildSplitProposalsForMarkedLaps,
  greedySequenceAlign,
  rankCandidates,
  type LowConfidenceRange,
  type ProgressCurvePoint,
  type TrackMatchProposal,
} from "./trackProgressMath.js";

const FEATURES_DIR = path.join(DATA_DIR, "cache", "features");

export interface LoadedReferencePoint {
  id: string;
  timestampMs: number;
  progress: number;
  gray: Uint8Array;
}

export interface BuildReferencePointsResult {
  pointCount: number;
}

export interface RunTrackMatchResult {
  curveSamples: ProgressCurvePoint[];
  proposals: TrackMatchProposal[];
  lowConfidenceRanges: LowConfidenceRange[];
}

function runFfmpeg(args: string[]): void {
  const result = spawnSync(FFMPEG_PATH, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed: ${result.stderr?.slice(-600) ?? result.error?.message ?? "unknown"}`,
    );
  }
}

export function cropToPixels(crop: ReferenceProfileCrop) {
  return {
    left: Math.round(crop.left * DETECTION_FRAME_WIDTH),
    top: Math.round(crop.top * DETECTION_FRAME_HEIGHT),
    width: Math.round((1 - crop.left - crop.right) * DETECTION_FRAME_WIDTH),
    height: Math.round((1 - crop.top - crop.bottom) * DETECTION_FRAME_HEIGHT),
  };
}

function extractScanFrames(
  videoPath: string,
  scanStart: number,
  duration: number,
  scanFps: number,
  outDir: string,
  reuseCache: boolean,
): string[] {
  fs.mkdirSync(outDir, { recursive: true });
  if (reuseCache) {
    const existing = fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).sort();
    if (existing.length > 0) return existing;
  } else {
    for (const file of fs.readdirSync(outDir)) {
      if (file.endsWith(".png")) fs.rmSync(path.join(outDir, file), { force: true });
    }
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

async function loadTrackGray(filePath: string, crop: ReferenceProfileCrop): Promise<Uint8Array> {
  const extract = cropToPixels(crop);
  const { data } = await sharp(filePath)
    .extract(extract)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

function featureRelativePath(profileId: string, pointId: string): string {
  return path.join(profileId, `${pointId}.raw`);
}

function deleteProfileFeatures(profileId: string): void {
  const dir = path.join(FEATURES_DIR, profileId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function countReferencePoints(profileId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM track_reference_points WHERE profileId = ?`)
    .get(profileId) as { count: number };
  return row.count;
}

export function loadReferencePoints(profileId: string): LoadedReferencePoint[] {
  const rows = getDb()
    .prepare(
      `SELECT id, timestampMs, progress, featurePath FROM track_reference_points
       WHERE profileId = ? ORDER BY progress`,
    )
    .all(profileId) as Array<{
    id: string;
    timestampMs: number;
    progress: number;
    featurePath: string;
  }>;

  return rows.map((row) => {
    const absPath = path.join(FEATURES_DIR, row.featurePath);
    const gray = new Uint8Array(fs.readFileSync(absPath));
    return {
      id: row.id,
      timestampMs: row.timestampMs,
      progress: row.progress,
      gray,
    };
  });
}

export async function buildReferencePoints(
  profile: ReferenceProfileDto,
  videoPath: string,
  options?: {
    onProgress?: (progress: number) => void;
    isCancelled?: () => boolean;
    reuseScanCache?: boolean;
  },
): Promise<BuildReferencePointsResult> {
  const { referenceStartSeconds: refStart, referenceEndSeconds: refEnd } = profile;
  const duration = refEnd - refStart;
  if (duration <= 0) {
    throw Object.assign(new Error("Reference lap duration must be positive"), {
      code: "VALIDATION",
    });
  }

  const scanFps = profile.scanFps;
  const workDir = path.join(
    DATA_DIR,
    "cache",
    profile.trackId,
    `ref-build-${profile.id}`,
  );
  const scanDir = path.join(workDir, "ref-scan");
  const frames = extractScanFrames(
    videoPath,
    refStart,
    duration,
    scanFps,
    scanDir,
    options?.reuseScanCache ?? true,
  );

  options?.onProgress?.(0.1);

  const db = getDb();
  const now = new Date().toISOString();
  const pending: Array<{
    id: string;
    timestampMs: number;
    progress: number;
    featurePath: string;
    gray: Uint8Array;
  }> = [];

  for (let i = 0; i < frames.length; i++) {
    if (options?.isCancelled?.()) {
      throw Object.assign(new Error("Build cancelled"), { code: "CANCELLED" });
    }

    const timeSec = refStart + i / scanFps;
    if (timeSec >= refEnd) break;

    const gray = await loadTrackGray(path.join(scanDir, frames[i]!), profile.crop);
    const pointId = randomUUID();
    pending.push({
      id: pointId,
      timestampMs: Math.round(timeSec * 1000),
      progress: Math.min(1, Math.max(0, (timeSec - refStart) / duration)),
      featurePath: featureRelativePath(profile.id, pointId),
      gray,
    });
    options?.onProgress?.(0.1 + (0.7 * pending.length) / Math.max(frames.length, 1));
  }

  const save = db.transaction(() => {
    db.prepare(`DELETE FROM track_reference_points WHERE profileId = ?`).run(profile.id);
    deleteProfileFeatures(profile.id);
    fs.mkdirSync(path.join(FEATURES_DIR, profile.id), { recursive: true });

    const insert = db.prepare(
      `INSERT INTO track_reference_points (
        id, profileId, timestampMs, progress, featurePath, perceptualHash, createdAt
      ) VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    );

    for (const point of pending) {
      const absPath = path.join(FEATURES_DIR, point.featurePath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, Buffer.from(point.gray));
      insert.run(
        point.id,
        profile.id,
        point.timestampMs,
        point.progress,
        point.featurePath,
        now,
      );
    }
  });

  save();
  options?.onProgress?.(1);
  return { pointCount: pending.length };
}

export async function runTrackMatch(
  profile: ReferenceProfileDto,
  videoPath: string,
  scanStart: number,
  scanEnd: number,
  refPoints: LoadedReferencePoint[],
  options?: {
    onProgress?: (progress: number) => void;
    isCancelled?: () => boolean;
    reuseScanCache?: boolean;
    lapStartTimes?: number[];
  },
): Promise<RunTrackMatchResult> {
  if (refPoints.length === 0) {
    throw Object.assign(new Error("No reference points — build reference profile first"), {
      code: "VALIDATION",
    });
  }

  const duration = Math.max(0, scanEnd - scanStart);
  if (duration <= 0) {
    throw Object.assign(new Error("Scan range must be positive"), { code: "VALIDATION" });
  }

  const scanFps = profile.scanFps;
  const workDir = path.join(DATA_DIR, "cache", profile.trackId, "match-scan");
  const scanDir = path.join(workDir, `from${Math.round(scanStart)}-fps${scanFps}`);
  const frames = extractScanFrames(
    videoPath,
    scanStart,
    duration,
    scanFps,
    scanDir,
    options?.reuseScanCache ?? false,
  );

  options?.onProgress?.(0.05);

  const progressFrames = [];
  const candidateLists = [];
  const refForMatch = refPoints.map((p) => ({ progress: p.progress, gray: p.gray }));

  for (let i = 0; i < frames.length; i++) {
    if (options?.isCancelled?.()) {
      throw Object.assign(new Error("Match cancelled"), { code: "CANCELLED" });
    }

    const timeSec = scanStart + i / scanFps;
    if (timeSec > scanEnd) break;

    const gray = await loadTrackGray(path.join(scanDir, frames[i]!), profile.crop);
    progressFrames.push({ timestampMs: Math.round(timeSec * 1000), timeSec });
    candidateLists.push(rankCandidates(gray, refForMatch));
    options?.onProgress?.(0.05 + (0.55 * (i + 1)) / frames.length);
  }

  const curve = greedySequenceAlign(
    progressFrames,
    candidateLists,
    scanFps,
    profile.maxProgressJumpPerSec,
  );

  options?.onProgress?.(0.75);

  const lapProposals = detectLapStartProposals(
    curve,
    profile.minLapTimeMs,
    profile.lapBoundaryConfidenceMin,
  );
  const splitTargets = profile.splits.map((s) => ({
    splitIndex: s.splitIndex,
    progress: s.progress ?? null,
  }));
  const splitProposals =
    options?.lapStartTimes && options.lapStartTimes.length > 0
      ? buildSplitProposalsForMarkedLaps(
          progressFrames,
          candidateLists,
          splitTargets,
          profile.splitConfidenceMin,
          options.lapStartTimes,
          scanEnd,
          scanFps,
          profile.maxProgressJumpPerSec,
        )
      : detectSplitCrossingProposals(
          curve,
          splitTargets,
          profile.splitConfidenceMin,
        );
  const proposals = [...lapProposals, ...splitProposals].sort(
    (a, b) => a.timeSeconds - b.timeSeconds,
  );
  const lowConfidenceRanges = detectLowConfidenceRanges(curve, profile.splitConfidenceMin);

  options?.onProgress?.(1);

  return { curveSamples: curve, proposals, lowConfidenceRanges };
}
