import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { VIDEO_LIBRARY_ROOT } from "../config.js";
import { resolveLocalVideoPath } from "../paths.js";
import { getDb } from "../db/database.js";
import { headS3Object, sessionObjectKey } from "./objectStorage.js";
import { bestLapTimeMs, computeLaps } from "../services/laps.js";
import {
  assertTimeInsideLap,
  assignSplitsToLaps,
  findLapForSplitTime,
  lapBoundsForNumber,
  rebalanceLapSplitIndices,
  rebalanceSessionSplitIndices,
} from "../services/splits.js";
import { getTrackByName } from "../services/tracks.js";
import { getTrackSplitsByName } from "../services/trackSplits.js";
import type {
  CreateSessionBody,
  LapDto,
  MarkerDto,
  SessionDetail,
  SessionRow,
  SessionStatus,
  SessionSummary,
  StorageKind,
  UpdateMarkerBody,
  UpdateSessionBody,
  UploadStatus,
} from "../types.js";
import type { FlatLapRow } from "../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function rowToSession(row: SessionRow): SessionRow {
  return row;
}

function sessionVideoPath(row: SessionRow): string {
  return resolveLocalVideoPath(row);
}

function resolveStatus(row: SessionRow): SessionStatus {
  if (row.status === "processing" || row.status === "error") {
    return row.status;
  }
  if (row.storageKind === "s3") {
    if (row.uploadStatus !== "complete") return "processing";
    return row.status === "missing" ? "missing" : "ready";
  }
  return fs.existsSync(sessionVideoPath(row)) ? "ready" : "missing";
}

function getLapStartMarkersForSession(sessionId: string) {
  return getDb()
    .prepare(
      `SELECT id, sessionId, timeSeconds, label, ignored FROM markers WHERE sessionId = ? AND kind = 'lapStart' ORDER BY timeSeconds`,
    )
    .all(sessionId) as Array<{
    id: string;
    sessionId: string;
    timeSeconds: number;
    label: string | null;
    ignored: number;
  }>;
}

function getSplitMarkersForSession(sessionId: string) {
  return getDb()
    .prepare(
      `SELECT id, sessionId, timeSeconds, label, splitIndex FROM markers WHERE sessionId = ? AND kind = 'split' ORDER BY timeSeconds`,
    )
    .all(sessionId) as Array<{
    id: string;
    sessionId: string;
    timeSeconds: number;
    label: string | null;
    splitIndex: number | null;
  }>;
}

function lapStartMarkersToDto(
  rows: Array<{
    id: string;
    sessionId: string;
    timeSeconds: number;
    label: string | null;
    ignored: number;
  }>,
): MarkerDto[] {
  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    timeSeconds: row.timeSeconds,
    label: row.label ?? undefined,
    ignored: row.ignored === 1,
    kind: "lapStart" as const,
  }));
}

function getMarkerInputs(sessionId: string) {
  return getLapStartMarkersForSession(sessionId).map((m) => ({
    id: m.id,
    timeSeconds: m.timeSeconds,
    ignored: m.ignored === 1,
  }));
}

function trackSplitsForSession(row: SessionRow) {
  if (!row.trackName) return [];
  return getTrackSplitsByName(row.trackName, row.userId);
}

function splitsForSession(row: SessionRow, laps: LapDto[]) {
  const splitMarkers = getSplitMarkersForSession(row.id);
  const trackSplits = trackSplitsForSession(row);
  return assignSplitsToLaps(row.id, splitMarkers, laps, trackSplits);
}

function lapsForSession(row: SessionRow): LapDto[] {
  const markers = getMarkerInputs(row.id);
  return computeLaps(row.id, markers, row.durationSeconds);
}

function toSummary(row: SessionRow): SessionSummary {
  const status = resolveStatus(row);
  const laps = lapsForSession(row);
  const countedLaps = laps.filter((lap) => !lap.ignored);
  const best = bestLapTimeMs(laps);

  return {
    id: row.id,
    title: row.title,
    sourcePath: row.sourcePath,
    status,
    track: row.trackName ?? undefined,
    date: row.recordedAt ?? undefined,
    lapCount: countedLaps.length,
    bestLapTimeMs: best,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listSessions(userId: string): SessionSummary[] {
  const rows = getDb()
    .prepare(`SELECT * FROM sessions WHERE userId = ? ORDER BY createdAt DESC`)
    .all(userId) as SessionRow[];
  return rows.map(toSummary);
}

export function getSessionById(id: string, userId: string): SessionDetail | null {
  const row = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ? AND userId = ?`)
    .get(id, userId) as SessionRow | undefined;
  if (!row) return null;

  const laps = lapsForSession(row);
  const trackSplits = trackSplitsForSession(row);
  rebalanceSessionSplitIndices(row.id, laps, trackSplits);
  const summary = toSummary(row);
  const markers = lapStartMarkersToDto(getLapStartMarkersForSession(row.id));
  const splits = splitsForSession(row, laps);

  return {
    ...summary,
    notes: row.notes ?? undefined,
    fileName: row.fileName,
    durationSeconds: row.durationSeconds,
    storageKind: (row.storageKind as StorageKind | undefined) ?? "local_path",
    objectKey: row.objectKey ?? null,
    uploadStatus: (row.uploadStatus as UploadStatus | undefined) ?? null,
    markers,
    splits,
    laps,
    trackSplits,
  };
}

export function getSessionSourcePath(id: string, userId: string): string | null {
  const row = getDb()
    .prepare(`SELECT sourcePath, relativePath, storageKind FROM sessions WHERE id = ? AND userId = ?`)
    .get(id, userId) as
    | { sourcePath: string; relativePath?: string | null; storageKind?: string }
    | undefined;
  if (!row || row.storageKind === "s3") return null;
  return sessionVideoPath(row as SessionRow);
}

export function getSessionVideoTarget(
  id: string,
  userId: string,
): { kind: "local_path"; path: string } | { kind: "s3"; objectKey: string } | null {
  const row = getDb()
    .prepare(`SELECT sourcePath, relativePath, storageKind, objectKey, uploadStatus FROM sessions WHERE id = ? AND userId = ?`)
    .get(id, userId) as
    | {
        sourcePath: string;
        relativePath?: string | null;
        storageKind?: string;
        objectKey?: string | null;
        uploadStatus?: string | null;
      }
    | undefined;
  if (!row) return null;
  if (row.storageKind === "s3") {
    if (!row.objectKey || row.uploadStatus !== "complete") return null;
    return { kind: "s3", objectKey: row.objectKey };
  }
  return { kind: "local_path", path: sessionVideoPath(row as SessionRow) };
}

function normalizePathParts(sourcePath: string): {
  sourceRoot: string;
  relativePath: string;
  fileName: string;
} {
  const normalized = path.normalize(sourcePath);
  const fileName = path.basename(normalized);
  const root = path.normalize(VIDEO_LIBRARY_ROOT);
  let relativePath = path.relative(root, normalized);
  if (relativePath.startsWith("..")) {
    relativePath = fileName;
  }
  return { sourceRoot: root, relativePath, fileName };
}

function probeFile(sourcePath: string): {
  fileSizeBytes: number | null;
  fileModifiedAt: string | null;
  durationSeconds: number | null;
  status: SessionStatus;
} {
  if (!fs.existsSync(sourcePath)) {
    return {
      fileSizeBytes: null,
      fileModifiedAt: null,
      durationSeconds: null,
      status: "missing",
    };
  }
  const stat = fs.statSync(sourcePath);
  return {
    fileSizeBytes: stat.size,
    fileModifiedAt: stat.mtime.toISOString(),
    durationSeconds: null,
    status: "ready",
  };
}

export function findSessionByPath(sourcePath: string): SessionRow | null {
  const normalized = path.normalize(sourcePath);
  const row = getDb()
    .prepare(`SELECT * FROM sessions WHERE sourcePath = ?`)
    .get(normalized) as SessionRow | undefined;
  return row ? rowToSession(row) : null;
}

export function createSession(body: CreateSessionBody, userId: string): SessionDetail {
  const normalized = path.normalize(body.sourcePath);
  const existing = findSessionByPath(normalized);
  if (existing) {
    const err = new Error("Session already exists for this path") as Error & {
      code: string;
      sessionId: string;
    };
    err.code = "DUPLICATE_PATH";
    err.sessionId = existing.id;
    throw err;
  }

  const { sourceRoot, relativePath, fileName } = normalizePathParts(normalized);
  const probe = probeFile(normalized);
  const id = randomUUID();
  const ts = nowIso();
  const title = body.title?.trim() || fileName;

  getDb()
    .prepare(
      `INSERT INTO sessions (
        id, userId, title, sourcePath, sourceRoot, relativePath, fileName,
        fileSizeBytes, fileModifiedAt, recordedAt, trackName, notes,
        durationSeconds, status, storageKind, objectKey, uploadStatus, createdAt, updatedAt
      ) VALUES (
        @id, @userId, @title, @sourcePath, @sourceRoot, @relativePath, @fileName,
        @fileSizeBytes, @fileModifiedAt, @recordedAt, @trackName, @notes,
        @durationSeconds, @status, @storageKind, @objectKey, @uploadStatus, @createdAt, @updatedAt
      )`,
    )
    .run({
      id,
      userId,
      title,
      sourcePath: normalized,
      sourceRoot,
      relativePath,
      fileName,
      fileSizeBytes: probe.fileSizeBytes,
      fileModifiedAt: probe.fileModifiedAt,
      recordedAt: body.recordedAt ?? null,
      trackName: body.trackName ?? null,
      notes: body.notes ?? null,
      durationSeconds: probe.durationSeconds,
      status: probe.status,
      storageKind: "local_path",
      objectKey: null,
      uploadStatus: null,
      createdAt: ts,
      updatedAt: ts,
    });

  return getSessionById(id, userId)!;
}

export function updateSession(
  id: string,
  body: UpdateSessionBody,
  userId: string,
): SessionDetail {
  const existing = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ? AND userId = ?`)
    .get(id, userId) as SessionRow | undefined;
  if (!existing) {
    throw Object.assign(new Error("Session not found"), { code: "NOT_FOUND" });
  }

  const title =
    body.title !== undefined ? body.title.trim() || existing.fileName : existing.title;
  const trackName =
    body.trackName !== undefined
      ? body.trackName?.trim() || null
      : existing.trackName;
  const recordedAt =
    body.recordedAt !== undefined ? body.recordedAt || null : existing.recordedAt;
  const notes =
    body.notes !== undefined ? body.notes?.trim() || null : existing.notes;
  const durationSeconds =
    body.durationSeconds !== undefined
      ? body.durationSeconds
      : existing.durationSeconds;
  const ts = nowIso();

  getDb()
    .prepare(
      `UPDATE sessions SET title = ?, trackName = ?, recordedAt = ?, notes = ?, durationSeconds = ?, updatedAt = ?
       WHERE id = ? AND userId = ?`,
    )
    .run(title, trackName, recordedAt, notes, durationSeconds, ts, id, userId);

  return getSessionById(id, userId)!;
}

export function insertMarker(
  sessionId: string,
  timeSeconds: number,
  options: {
    label?: string;
    kind?: "lapStart" | "split";
    lapNumber?: number;
    splitIndex?: number;
  } | undefined,
  userId: string,
): MarkerDto {
  const session = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ? AND userId = ?`)
    .get(sessionId, userId) as SessionRow | undefined;
  if (!session) {
    throw Object.assign(new Error("Session not found"), { code: "NOT_FOUND" });
  }

  const kind = options?.kind ?? "lapStart";
  if (kind === "split") {
    if (options?.lapNumber == null || !Number.isInteger(options.lapNumber)) {
      throw Object.assign(new Error("lapNumber is required for split markers"), {
        code: "VALIDATION",
      });
    }
    if (options?.splitIndex == null || !Number.isInteger(options.splitIndex)) {
      throw Object.assign(new Error("splitIndex is required for split markers"), {
        code: "VALIDATION",
      });
    }
    if (!session.trackName) {
      throw Object.assign(
        new Error("Session must have a track before marking splits"),
        { code: "VALIDATION" },
      );
    }
    const track = getTrackByName(session.trackName, session.userId);
    if (!track?.splits?.length) {
      throw Object.assign(
        new Error("Track has no splits defined — configure them on the Tracks page"),
        { code: "VALIDATION" },
      );
    }
    const trackSplit = track.splits.find((s) => s.splitIndex === options.splitIndex);
    if (!trackSplit) {
      throw Object.assign(new Error("Invalid split index for this track"), {
        code: "VALIDATION",
      });
    }

    const laps = lapsForSession(session);
    const bounds = lapBoundsForNumber(laps, options.lapNumber);
    if (!bounds) {
      throw Object.assign(new Error("Lap not found"), { code: "VALIDATION" });
    }
    assertTimeInsideLap(timeSeconds, bounds.startSeconds, bounds.endSeconds);

    const id = randomUUID();
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO markers (id, sessionId, timeSeconds, kind, label, ignored, splitIndex, createdAt, updatedAt)
         VALUES (@id, @sessionId, @timeSeconds, 'split', @label, 0, NULL, @createdAt, @updatedAt)`,
      )
      .run({
        id,
        sessionId,
        timeSeconds,
        label: trackSplit.name,
        createdAt: ts,
        updatedAt: ts,
      });

    const lapsAfter = lapsForSession(session);
    rebalanceLapSplitIndices(sessionId, options.lapNumber, lapsAfter, track.splits);

    getDb()
      .prepare(`UPDATE sessions SET updatedAt = ? WHERE id = ?`)
      .run(ts, sessionId);

    const updatedSplits = splitsForSession(session, lapsAfter);
    const created = updatedSplits.find((s) => s.id === id);

    return {
      id,
      sessionId,
      timeSeconds,
      label: created?.label ?? trackSplit.name,
      ignored: false,
      kind: "split",
    };
  }

  const id = randomUUID();
  const ts = nowIso();
  const label = options?.label ?? null;

  getDb()
    .prepare(
      `INSERT INTO markers (id, sessionId, timeSeconds, kind, label, ignored, createdAt, updatedAt)
       VALUES (@id, @sessionId, @timeSeconds, 'lapStart', @label, 0, @createdAt, @updatedAt)`,
    )
    .run({
      id,
      sessionId,
      timeSeconds,
      label,
      createdAt: ts,
      updatedAt: ts,
    });

  getDb()
    .prepare(`UPDATE sessions SET updatedAt = ? WHERE id = ?`)
    .run(ts, sessionId);

  return {
    id,
    sessionId,
    timeSeconds,
    label: label ?? undefined,
    ignored: false,
    kind: "lapStart",
  };
}

export function updateMarker(
  markerId: string,
  body: UpdateMarkerBody,
  userId: string,
): MarkerDto {
  const row = getDb()
    .prepare(`SELECT * FROM markers WHERE id = ?`)
    .get(markerId) as
    | {
        id: string;
        sessionId: string;
        timeSeconds: number;
        label: string | null;
        ignored: number;
        kind: string;
        splitIndex: number | null;
      }
    | undefined;

  if (!row) {
    throw Object.assign(new Error("Marker not found"), { code: "NOT_FOUND" });
  }

  const timeSeconds =
    body.timeSeconds !== undefined ? body.timeSeconds : row.timeSeconds;
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
    throw Object.assign(new Error("timeSeconds must be a non-negative number"), {
      code: "VALIDATION",
    });
  }

  const session = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ? AND userId = ?`)
    .get(row.sessionId, userId) as SessionRow | undefined;
  if (!session) {
    throw Object.assign(new Error("Session not found"), { code: "NOT_FOUND" });
  }
  const laps = lapsForSession(session);

  if (row.kind === "split") {
    const lap = findLapForSplitTime(laps, timeSeconds);
    if (!lap) {
      throw Object.assign(new Error("Split is outside any lap"), { code: "VALIDATION" });
    }
    assertTimeInsideLap(timeSeconds, lap.startSeconds, lap.endSeconds);
  } else if (body.timeSeconds !== undefined && body.timeSeconds !== row.timeSeconds) {
    const lapMarkers = getLapStartMarkersForSession(row.sessionId);
    const lapIndex = lapMarkers.findIndex((m) => m.id === markerId);
    const splitMarkers = getSplitMarkersForSession(row.sessionId);

    if (lapIndex >= 0) {
      const lapNumber = lapIndex + 1;
      const lap = laps.find((l) => l.lapNumber === lapNumber);
      if (lap) {
        for (const split of splitMarkers) {
          const splitLap = findLapForSplitTime(laps, split.timeSeconds);
          if (splitLap?.lapNumber === lapNumber) {
            assertTimeInsideLap(split.timeSeconds, timeSeconds, lap.endSeconds);
          }
        }
      }

      if (lapIndex > 0) {
        const prevLap = laps.find((l) => l.lapNumber === lapIndex);
        if (prevLap) {
          for (const split of splitMarkers) {
            const splitLap = findLapForSplitTime(laps, split.timeSeconds);
            if (splitLap?.lapNumber === lapIndex) {
              assertTimeInsideLap(
                split.timeSeconds,
                prevLap.startSeconds,
                timeSeconds,
              );
            }
          }
        }
      }
    }
  }

  const label =
    body.label !== undefined ? body.label?.trim() || null : row.label;
  const ignored =
    body.ignored !== undefined ? (body.ignored ? 1 : 0) : row.ignored;
  const ts = nowIso();

  getDb()
    .prepare(
      `UPDATE markers SET timeSeconds = ?, label = ?, ignored = ?, updatedAt = ? WHERE id = ?`,
    )
    .run(timeSeconds, label, ignored, ts, markerId);

  if (row.kind === "split" && body.timeSeconds !== undefined) {
    const lap = findLapForSplitTime(laps, timeSeconds);
    if (lap && session.trackName) {
      const track = getTrackByName(session.trackName, session.userId);
      if (track?.splits?.length) {
        rebalanceLapSplitIndices(row.sessionId, lap.lapNumber, laps, track.splits);
      }
    }
  }

  getDb()
    .prepare(`UPDATE sessions SET updatedAt = ? WHERE id = ?`)
    .run(ts, row.sessionId);

  const kind = row.kind === "split" ? "split" : "lapStart";
  let resolvedLabel = label ?? undefined;
  if (kind === "split") {
    const updatedSplits = splitsForSession(session, laps);
    const split = updatedSplits.find((s) => s.id === markerId);
    resolvedLabel = split?.label;
  }

  return {
    id: row.id,
    sessionId: row.sessionId,
    timeSeconds,
    label: resolvedLabel,
    ignored: ignored === 1,
    kind,
  };
}

export function deleteMarker(markerId: string, userId: string): boolean {
  const row = getDb()
    .prepare(`SELECT sessionId, kind, timeSeconds FROM markers WHERE id = ?`)
    .get(markerId) as
    | { sessionId: string; kind: string; timeSeconds: number }
    | undefined;

  if (!row) return false;

  const session = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ? AND userId = ?`)
    .get(row.sessionId, userId) as SessionRow | undefined;
  if (!session) return false;

  const laps = session ? lapsForSession(session) : null;
  const splitLap =
    row.kind === "split" && laps
      ? findLapForSplitTime(laps, row.timeSeconds)
      : null;

  const result = getDb().prepare(`DELETE FROM markers WHERE id = ?`).run(markerId);
  if (result.changes > 0) {
    const ts = nowIso();
    getDb()
      .prepare(`UPDATE sessions SET updatedAt = ? WHERE id = ?`)
      .run(ts, row.sessionId);

    if (splitLap && session?.trackName) {
      const track = getTrackByName(session.trackName, session.userId);
      if (track?.splits?.length && laps) {
        rebalanceLapSplitIndices(row.sessionId, splitLap.lapNumber, laps, track.splits);
      }
    }
  }
  return result.changes > 0;
}

export function deleteSession(id: string, userId: string): boolean {
  const result = getDb()
    .prepare(`DELETE FROM sessions WHERE id = ? AND userId = ?`)
    .run(id, userId);
  return result.changes > 0;
}

export function listAllLaps(userId: string): FlatLapRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM sessions WHERE userId = ? ORDER BY createdAt DESC`)
    .all(userId) as SessionRow[];

  const flat: FlatLapRow[] = [];
  for (const row of rows) {
    const laps = lapsForSession(row);
    const best = bestLapTimeMs(laps);
    for (const lap of laps) {
      if (lap.ignored) continue;
      flat.push({
        id: lap.id,
        sessionId: row.id,
        sessionTitle: row.title,
        sessionTrack: row.trackName ?? undefined,
        sessionDate: row.recordedAt ?? undefined,
        lapNumber: lap.lapNumber,
        lapTimeMs: lap.lapTimeMs,
        isBestInSession: best != null && lap.lapTimeMs === best,
        ignored: lap.ignored,
      });
    }
  }
  return flat;
}

export function countSessions(userId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) as c FROM sessions WHERE userId = ?`)
    .get(userId) as { c: number };
  return row.c;
}

export function createS3UploadSession(
  body: {
    sessionId: string;
    fileName: string;
    title?: string;
    trackName?: string | null;
    recordedAt?: string | null;
    notes?: string | null;
  },
  userId: string,
): SessionDetail {
  const fileName = path.basename(body.fileName);
  const objectKey = sessionObjectKey(userId, body.sessionId, fileName);
  const sourcePath = `s3://${objectKey}`;
  const ts = nowIso();
  const title = body.title?.trim() || fileName;

  getDb()
    .prepare(
      `INSERT INTO sessions (
        id, userId, title, sourcePath, sourceRoot, relativePath, fileName,
        fileSizeBytes, fileModifiedAt, recordedAt, trackName, notes,
        durationSeconds, status, storageKind, objectKey, uploadStatus, createdAt, updatedAt
      ) VALUES (
        @id, @userId, @title, @sourcePath, @sourceRoot, @relativePath, @fileName,
        @fileSizeBytes, @fileModifiedAt, @recordedAt, @trackName, @notes,
        @durationSeconds, @status, @storageKind, @objectKey, @uploadStatus, @createdAt, @updatedAt
      )`,
    )
    .run({
      id: body.sessionId,
      userId,
      title,
      sourcePath,
      sourceRoot: "s3",
      relativePath: objectKey,
      fileName,
      fileSizeBytes: null,
      fileModifiedAt: null,
      recordedAt: body.recordedAt ?? null,
      trackName: body.trackName ?? null,
      notes: body.notes ?? null,
      durationSeconds: null,
      status: "processing",
      storageKind: "s3",
      objectKey,
      uploadStatus: "pending",
      createdAt: ts,
      updatedAt: ts,
    });

  return getSessionById(body.sessionId, userId)!;
}

export async function completeS3UploadSession(
  id: string,
  userId: string,
): Promise<SessionDetail> {
  const row = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ? AND userId = ?`)
    .get(id, userId) as SessionRow | undefined;
  if (!row) {
    throw Object.assign(new Error("Session not found"), { code: "NOT_FOUND" });
  }
  if (row.storageKind !== "s3" || !row.objectKey) {
    throw Object.assign(new Error("Session is not an S3 upload"), { code: "NOT_FOUND" });
  }

  const head = await headS3Object(row.objectKey);
  if (!head.exists) {
    throw Object.assign(new Error("Upload not found in object storage"), { code: "UPLOAD_MISSING" });
  }

  const ts = nowIso();
  getDb()
    .prepare(
      `UPDATE sessions SET fileSizeBytes = ?, uploadStatus = ?, status = ?, updatedAt = ?
       WHERE id = ? AND userId = ?`,
    )
    .run(head.size, "complete", "ready", ts, id, userId);

  return getSessionById(id, userId)!;
}
