import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { VIDEO_LIBRARY_ROOT } from "../config.js";
import { getDb } from "../db/database.js";
import { bestLapTimeMs, computeLaps } from "../services/laps.js";
import {
  assertTimeInsideLap,
  assignSplitsToLaps,
  findLapForSplitTime,
  findSplitMarkerInLap,
  lapBoundsForNumber,
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
  UpdateMarkerBody,
  UpdateSessionBody,
} from "../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function rowToSession(row: SessionRow): SessionRow {
  return row;
}

function resolveStatus(sourcePath: string, storedStatus: SessionStatus): SessionStatus {
  if (storedStatus === "processing" || storedStatus === "error") {
    return storedStatus;
  }
  return fs.existsSync(sourcePath) ? "ready" : "missing";
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
  return getTrackSplitsByName(row.trackName);
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
  const status = resolveStatus(row.sourcePath, row.status);
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
  };
}

export function listSessions(): SessionSummary[] {
  const rows = getDb()
    .prepare(`SELECT * FROM sessions ORDER BY createdAt DESC`)
    .all() as SessionRow[];
  return rows.map(toSummary);
}

export function getSessionById(id: string): SessionDetail | null {
  const row = getDb().prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as
    | SessionRow
    | undefined;
  if (!row) return null;

  const laps = lapsForSession(row);
  const summary = toSummary(row);
  const markers = lapStartMarkersToDto(getLapStartMarkersForSession(row.id));
  const splits = splitsForSession(row, laps);
  const trackSplits = trackSplitsForSession(row);

  return {
    ...summary,
    notes: row.notes ?? undefined,
    fileName: row.fileName,
    durationSeconds: row.durationSeconds,
    markers,
    splits,
    laps,
    trackSplits,
  };
}

export function getSessionSourcePath(id: string): string | null {
  const row = getDb()
    .prepare(`SELECT sourcePath FROM sessions WHERE id = ?`)
    .get(id) as { sourcePath: string } | undefined;
  return row?.sourcePath ?? null;
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

export function createSession(body: CreateSessionBody): SessionDetail {
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
        id, title, sourcePath, sourceRoot, relativePath, fileName,
        fileSizeBytes, fileModifiedAt, recordedAt, trackName, notes,
        durationSeconds, status, createdAt, updatedAt
      ) VALUES (
        @id, @title, @sourcePath, @sourceRoot, @relativePath, @fileName,
        @fileSizeBytes, @fileModifiedAt, @recordedAt, @trackName, @notes,
        @durationSeconds, @status, @createdAt, @updatedAt
      )`,
    )
    .run({
      id,
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
      createdAt: ts,
      updatedAt: ts,
    });

  return getSessionById(id)!;
}

export function updateSession(id: string, body: UpdateSessionBody): SessionDetail {
  const existing = getDb().prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as
    | SessionRow
    | undefined;
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
       WHERE id = ?`,
    )
    .run(title, trackName, recordedAt, notes, durationSeconds, ts, id);

  return getSessionById(id)!;
}

export function insertMarker(
  sessionId: string,
  timeSeconds: number,
  options?: {
    label?: string;
    kind?: "lapStart" | "split";
    lapNumber?: number;
    splitIndex?: number;
  },
): MarkerDto {
  const session = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(sessionId) as SessionRow | undefined;
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
    const track = getTrackByName(session.trackName);
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

    const splitMarkers = getSplitMarkersForSession(sessionId);
    const existing = findSplitMarkerInLap(
      splitMarkers,
      laps,
      options.lapNumber,
      options.splitIndex,
    );
    if (existing) {
      return updateMarker(existing.id, { timeSeconds });
    }

    const id = randomUUID();
    const ts = nowIso();
    getDb()
      .prepare(
        `INSERT INTO markers (id, sessionId, timeSeconds, kind, label, ignored, splitIndex, createdAt, updatedAt)
         VALUES (@id, @sessionId, @timeSeconds, 'split', @label, 0, @splitIndex, @createdAt, @updatedAt)`,
      )
      .run({
        id,
        sessionId,
        timeSeconds,
        label: trackSplit.name,
        splitIndex: options.splitIndex,
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
      label: trackSplit.name,
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

export function updateMarker(markerId: string, body: UpdateMarkerBody): MarkerDto {
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
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(row.sessionId) as SessionRow;
  const laps = lapsForSession(session);

  if (row.kind === "split") {
    const lap = findLapForSplitTime(laps, timeSeconds);
    if (!lap) {
      throw Object.assign(new Error("Split is outside any lap"), { code: "VALIDATION" });
    }
    assertTimeInsideLap(timeSeconds, lap.startSeconds, lap.endSeconds);
    if (row.splitIndex != null) {
      const splitMarkers = getSplitMarkersForSession(row.sessionId);
      const duplicate = findSplitMarkerInLap(
        splitMarkers,
        laps,
        lap.lapNumber,
        row.splitIndex,
      );
      if (duplicate && duplicate.id !== markerId) {
        throw Object.assign(
          new Error("That split slot is already marked on this lap"),
          { code: "VALIDATION" },
        );
      }
    }
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

export function deleteMarker(markerId: string): boolean {
  const row = getDb()
    .prepare(`SELECT sessionId FROM markers WHERE id = ?`)
    .get(markerId) as { sessionId: string } | undefined;

  const result = getDb().prepare(`DELETE FROM markers WHERE id = ?`).run(markerId);
  if (result.changes > 0 && row) {
    getDb()
      .prepare(`UPDATE sessions SET updatedAt = ? WHERE id = ?`)
      .run(nowIso(), row.sessionId);
  }
  return result.changes > 0;
}

export function countSessions(): number {
  const row = getDb().prepare(`SELECT COUNT(*) as c FROM sessions`).get() as { c: number };
  return row.c;
}
