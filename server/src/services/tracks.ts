import { randomUUID } from "node:crypto";
import { getDb } from "../db/database.js";
import { getTrackSplits } from "./trackSplits.js";
import type { CreateTrackBody, TrackDto, UpdateTrackBody } from "../types.js";

interface TrackRow {
  id: string;
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

export function listTracks(): TrackDto[] {
  const rows = getDb()
    .prepare(`SELECT * FROM tracks ORDER BY name COLLATE NOCASE`)
    .all() as TrackRow[];
  return rows.map((row) => rowToDto(row, false));
}

export function getTrackById(id: string): TrackDto | null {
  const row = getDb()
    .prepare(`SELECT * FROM tracks WHERE id = ?`)
    .get(id) as TrackRow | undefined;
  return row ? rowToDto(row, true) : null;
}

export function getTrackByName(name: string): TrackDto | null {
  const row = getDb()
    .prepare(`SELECT * FROM tracks WHERE name = ?`)
    .get(name) as TrackRow | undefined;
  return row ? rowToDto(row, true) : null;
}

export function createTrack(body: CreateTrackBody): TrackDto {
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
        `INSERT INTO tracks (id, name, videoFolder, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, name, videoFolder, notes, now, now);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw Object.assign(new Error(`Track "${name}" already exists`), {
        code: "DUPLICATE_NAME",
      });
    }
    throw err;
  }

  return getTrackById(id)!;
}

export function updateTrack(id: string, body: UpdateTrackBody): TrackDto {
  const existing = getTrackById(id);
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
         WHERE id = ?`,
      )
      .run(name, videoFolder, notes, now, id);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw Object.assign(new Error(`Track "${name}" already exists`), {
        code: "DUPLICATE_NAME",
      });
    }
    throw err;
  }

  return getTrackById(id)!;
}

export function deleteTrack(id: string): void {
  const result = getDb().prepare(`DELETE FROM tracks WHERE id = ?`).run(id);
  if (result.changes === 0) {
    throw Object.assign(new Error("Track not found"), { code: "NOT_FOUND" });
  }
}

export function countTracks(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM tracks`).get() as {
    n: number;
  };
  return row.n;
}
