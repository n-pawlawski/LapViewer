import { randomUUID } from "node:crypto";
import { getDb } from "../db/database.js";
import { getTrackSplits } from "./trackSplits.js";
import type { CreateTrackBody, TrackDto, UpdateTrackBody } from "../types.js";

interface TrackRow {
  id: string;
  userId: string;
  name: string;
  videoFolder: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToDto(row: TrackRow, includeSplits = false): TrackDto {
  const splits = includeSplits ? getTrackSplits(row.id) : undefined;
  const splitCount = includeSplits
    ? (splits?.length ?? 0)
    : (getDb()
        .prepare(`SELECT COUNT(*) AS n FROM track_splits WHERE trackId = ?`)
        .get(row.id) as { n: number }).n;

  return {
    id: row.id,
    name: row.name,
    videoFolder: row.videoFolder ?? undefined,
    notes: row.notes ?? undefined,
    splitCount,
    splits,
  };
}

export function listTracks(userId: string): TrackDto[] {
  const rows = getDb()
    .prepare(`SELECT * FROM tracks WHERE userId = ? ORDER BY name COLLATE NOCASE`)
    .all(userId) as TrackRow[];
  return rows.map((row) => rowToDto(row, false));
}

export function getTrackById(id: string, userId: string): TrackDto | null {
  const row = getDb()
    .prepare(`SELECT * FROM tracks WHERE id = ? AND userId = ?`)
    .get(id, userId) as TrackRow | undefined;
  return row ? rowToDto(row, true) : null;
}

export function getTrackByName(name: string, userId: string): TrackDto | null {
  const row = getDb()
    .prepare(`SELECT * FROM tracks WHERE name = ? AND userId = ?`)
    .get(name, userId) as TrackRow | undefined;
  return row ? rowToDto(row, true) : null;
}

export function createTrack(body: CreateTrackBody, userId: string): TrackDto {
  const name = body.name.trim();
  if (!name) {
    throw Object.assign(new Error("Track name is required"), { code: "VALIDATION" });
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const videoFolder = body.videoFolder?.trim() || null;
  const notes = body.notes?.trim() || null;

  try {
    getDb()
      .prepare(
        `INSERT INTO tracks (id, userId, name, videoFolder, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, userId, name, videoFolder, notes, now, now);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw Object.assign(new Error(`Track "${name}" already exists`), {
        code: "DUPLICATE_NAME",
      });
    }
    throw err;
  }

  return getTrackById(id, userId)!;
}

export function updateTrack(id: string, body: UpdateTrackBody, userId: string): TrackDto {
  const existing = getTrackById(id, userId);
  if (!existing) {
    throw Object.assign(new Error("Track not found"), { code: "NOT_FOUND" });
  }

  const name = body.name !== undefined ? body.name.trim() : existing.name;
  if (!name) {
    throw Object.assign(new Error("Track name is required"), { code: "VALIDATION" });
  }

  const videoFolder =
    body.videoFolder !== undefined
      ? body.videoFolder.trim() || null
      : existing.videoFolder ?? null;
  const notes =
    body.notes !== undefined ? body.notes.trim() || null : existing.notes ?? null;
  const now = new Date().toISOString();

  try {
    getDb()
      .prepare(
        `UPDATE tracks SET name = ?, videoFolder = ?, notes = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`,
      )
      .run(name, videoFolder, notes, now, id, userId);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw Object.assign(new Error(`Track "${name}" already exists`), {
        code: "DUPLICATE_NAME",
      });
    }
    throw err;
  }

  return getTrackById(id, userId)!;
}

export function deleteTrack(id: string, userId: string): void {
  const result = getDb()
    .prepare(`DELETE FROM tracks WHERE id = ? AND userId = ?`)
    .run(id, userId);
  if (result.changes === 0) {
    throw Object.assign(new Error("Track not found"), { code: "NOT_FOUND" });
  }
}

export function countTracks(userId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM tracks WHERE userId = ?`)
    .get(userId) as { n: number };
  return row.n;
}
