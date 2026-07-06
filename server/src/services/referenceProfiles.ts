import { randomUUID } from "node:crypto";
import { getDb } from "../db/database.js";
import { assignSplitsToLaps } from "./splits.js";
import { computeLaps } from "./laps.js";
import { getTrackById } from "./tracks.js";
import { getTrackSplits } from "./trackSplits.js";
import { countReferencePoints } from "./trackProgressVision.js";
import type {
  ReferenceProfileDto,
  SaveReferenceProfileBody,
  TrackSplitDto,
} from "../types.js";

interface ReferenceProfileRow {
  id: string;
  trackId: string;
  referenceSessionId: string;
  referenceLapNumber: number;
  referenceStartMarkerId: string | null;
  referenceEndMarkerId: string | null;
  referenceStartSeconds: number;
  referenceEndSeconds: number;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  direction: string;
  scanFps: number;
  minLapTimeMs: number;
  maxProgressJumpPerSec: number;
  lapBoundaryConfidenceMin: number;
  splitConfidenceMin: number;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CROP = { top: 0.15, bottom: 0.2, left: 0, right: 0 };

function rowToDto(row: ReferenceProfileRow, splits: TrackSplitDto[]): ReferenceProfileDto {
  return {
    id: row.id,
    trackId: row.trackId,
    referencePointCount: countReferencePoints(row.id),
    referenceSessionId: row.referenceSessionId,
    referenceLapNumber: row.referenceLapNumber,
    referenceStartMarkerId: row.referenceStartMarkerId ?? undefined,
    referenceEndMarkerId: row.referenceEndMarkerId ?? undefined,
    referenceStartSeconds: row.referenceStartSeconds,
    referenceEndSeconds: row.referenceEndSeconds,
    crop: {
      top: row.cropTop,
      bottom: row.cropBottom,
      left: row.cropLeft,
      right: row.cropRight,
    },
    direction: row.direction as ReferenceProfileDto["direction"],
    scanFps: row.scanFps,
    minLapTimeMs: row.minLapTimeMs,
    maxProgressJumpPerSec: row.maxProgressJumpPerSec,
    lapBoundaryConfidenceMin: row.lapBoundaryConfidenceMin,
    splitConfidenceMin: row.splitConfidenceMin,
    splits,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getReferenceProfileByTrackId(
  trackId: string,
): ReferenceProfileDto | null {
  const row = getDb()
    .prepare(`SELECT * FROM track_reference_profiles WHERE trackId = ?`)
    .get(trackId) as ReferenceProfileRow | undefined;
  if (!row) return null;
  return rowToDto(row, getTrackSplits(trackId));
}

function getSessionRow(sessionId: string, userId: string) {
  return getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ? AND userId = ?`)
    .get(sessionId, userId) as
    | {
        id: string;
        trackName: string | null;
        durationSeconds: number | null;
      }
    | undefined;
}

function getLapStartMarkers(sessionId: string) {
  return getDb()
    .prepare(
      `SELECT id, timeSeconds FROM markers
       WHERE sessionId = ? AND kind = 'lapStart' ORDER BY timeSeconds`,
    )
    .all(sessionId) as Array<{ id: string; timeSeconds: number }>;
}

function getSplitMarkers(sessionId: string) {
  return getDb()
    .prepare(
      `SELECT id, timeSeconds, label, splitIndex FROM markers
       WHERE sessionId = ? AND kind = 'split' ORDER BY timeSeconds`,
    )
    .all(sessionId) as Array<{
    id: string;
    timeSeconds: number;
    label: string | null;
    splitIndex: number | null;
  }>;
}

function resolveReferenceLapBounds(
  sessionId: string,
  lapNumber: number,
  durationSeconds: number | null,
) {
  const starts = getLapStartMarkers(sessionId);
  if (lapNumber < 1 || lapNumber > starts.length) {
    throw Object.assign(
      new Error(`Reference lap ${lapNumber} not found (session has ${starts.length} lap start(s))`),
      { code: "VALIDATION" },
    );
  }

  const start = starts[lapNumber - 1]!;
  const next = starts[lapNumber];
  const endSeconds =
    next?.timeSeconds ??
    (durationSeconds != null && durationSeconds > start.timeSeconds
      ? durationSeconds
      : null);

  if (endSeconds == null || endSeconds <= start.timeSeconds) {
    throw Object.assign(
      new Error(
        "Reference lap end is unknown — add the next lap marker or set session duration",
      ),
      { code: "VALIDATION" },
    );
  }

  return {
    referenceStartMarkerId: start.id,
    referenceEndMarkerId: next?.id ?? null,
    referenceStartSeconds: start.timeSeconds,
    referenceEndSeconds: endSeconds,
  };
}

function computeSplitProgressValues(
  sessionId: string,
  lapNumber: number,
  startSeconds: number,
  endSeconds: number,
  trackSplits: TrackSplitDto[],
) {
  const duration = endSeconds - startSeconds;
  if (duration <= 0) return [];

  const markerInputs = getLapStartMarkers(sessionId).map((m) => ({
    id: m.id,
    timeSeconds: m.timeSeconds,
    ignored: false,
  }));
  const laps = computeLaps(sessionId, markerInputs, endSeconds);
  const lap = laps[lapNumber - 1];
  if (!lap) return [];

  const splitMarkers = getSplitMarkers(sessionId);
  const assigned = assignSplitsToLaps(sessionId, splitMarkers, laps, trackSplits);
  const lapSplits = assigned.filter((s) => s.lapNumber === lapNumber);

  return lapSplits.map((split) => ({
    splitIndex: split.splitIndex,
    progress: Math.min(1, Math.max(0, (split.timeSeconds - startSeconds) / duration)),
  }));
}

export function saveReferenceProfile(
  trackId: string,
  userId: string,
  body: SaveReferenceProfileBody,
): ReferenceProfileDto {
  const track = getTrackById(trackId, userId);
  if (!track) {
    throw Object.assign(new Error("Track not found"), { code: "NOT_FOUND" });
  }

  const session = getSessionRow(body.referenceSessionId, userId);
  if (!session) {
    throw Object.assign(new Error("Session not found"), { code: "NOT_FOUND" });
  }
  if (!session.trackName || session.trackName !== track.name) {
    throw Object.assign(
      new Error(`Session track "${session.trackName ?? "none"}" does not match "${track.name}"`),
      { code: "VALIDATION" },
    );
  }

  const lapNumber = body.referenceLapNumber;
  if (!Number.isInteger(lapNumber) || lapNumber < 1) {
    throw Object.assign(new Error("referenceLapNumber must be a positive integer"), {
      code: "VALIDATION",
    });
  }

  const bounds = resolveReferenceLapBounds(
    body.referenceSessionId,
    lapNumber,
    session.durationSeconds,
  );

  const trackSplits = getTrackSplits(trackId);
  const splitProgress = computeSplitProgressValues(
    body.referenceSessionId,
    lapNumber,
    bounds.referenceStartSeconds,
    bounds.referenceEndSeconds,
    trackSplits,
  );

  const crop = body.crop ?? DEFAULT_CROP;
  const direction = body.direction ?? "unknown";
  const now = new Date().toISOString();
  const db = getDb();

  const save = db.transaction(() => {
    const existing = db
      .prepare(`SELECT id FROM track_reference_profiles WHERE trackId = ?`)
      .get(trackId) as { id: string } | undefined;

    const profileId = existing?.id ?? randomUUID();

    if (existing) {
      db.prepare(
        `UPDATE track_reference_profiles SET
          referenceSessionId = ?,
          referenceLapNumber = ?,
          referenceStartMarkerId = ?,
          referenceEndMarkerId = ?,
          referenceStartSeconds = ?,
          referenceEndSeconds = ?,
          cropTop = ?, cropBottom = ?, cropLeft = ?, cropRight = ?,
          direction = ?,
          scanFps = COALESCE(?, scanFps),
          minLapTimeMs = COALESCE(?, minLapTimeMs),
          maxProgressJumpPerSec = COALESCE(?, maxProgressJumpPerSec),
          lapBoundaryConfidenceMin = COALESCE(?, lapBoundaryConfidenceMin),
          splitConfidenceMin = COALESCE(?, splitConfidenceMin),
          updatedAt = ?
         WHERE trackId = ?`,
      ).run(
        body.referenceSessionId,
        lapNumber,
        bounds.referenceStartMarkerId,
        bounds.referenceEndMarkerId,
        bounds.referenceStartSeconds,
        bounds.referenceEndSeconds,
        crop.top ?? DEFAULT_CROP.top,
        crop.bottom ?? DEFAULT_CROP.bottom,
        crop.left ?? DEFAULT_CROP.left,
        crop.right ?? DEFAULT_CROP.right,
        direction,
        body.scanFps ?? null,
        body.minLapTimeMs ?? null,
        body.maxProgressJumpPerSec ?? null,
        body.lapBoundaryConfidenceMin ?? null,
        body.splitConfidenceMin ?? null,
        now,
        trackId,
      );
    } else {
      db.prepare(
        `INSERT INTO track_reference_profiles (
          id, trackId, referenceSessionId, referenceLapNumber,
          referenceStartMarkerId, referenceEndMarkerId,
          referenceStartSeconds, referenceEndSeconds,
          cropTop, cropBottom, cropLeft, cropRight,
          direction, scanFps, minLapTimeMs, maxProgressJumpPerSec,
          lapBoundaryConfidenceMin, splitConfidenceMin,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        profileId,
        trackId,
        body.referenceSessionId,
        lapNumber,
        bounds.referenceStartMarkerId,
        bounds.referenceEndMarkerId,
        bounds.referenceStartSeconds,
        bounds.referenceEndSeconds,
        crop.top ?? DEFAULT_CROP.top,
        crop.bottom ?? DEFAULT_CROP.bottom,
        crop.left ?? DEFAULT_CROP.left,
        crop.right ?? DEFAULT_CROP.right,
        direction,
        body.scanFps ?? 5,
        body.minLapTimeMs ?? 25_000,
        body.maxProgressJumpPerSec ?? 0.12,
        body.lapBoundaryConfidenceMin ?? 0.65,
        body.splitConfidenceMin ?? 0.61,
        now,
        now,
      );
    }

    const updateProgress = db.prepare(
      `UPDATE track_splits SET progress = ?, updatedAt = ? WHERE trackId = ? AND splitIndex = ?`,
    );
    for (const entry of splitProgress) {
      updateProgress.run(entry.progress, now, trackId, entry.splitIndex);
    }

    db.prepare(`UPDATE tracks SET updatedAt = ? WHERE id = ?`).run(now, trackId);
  });

  save();

  return getReferenceProfileByTrackId(trackId)!;
}
