import { randomUUID } from "node:crypto";
import { getDb } from "../db/database.js";
import type { TrackSplitDto } from "../types.js";

interface TrackSplitRow {
  id: string;
  trackId: string;
  splitIndex: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function rowToDto(row: TrackSplitRow): TrackSplitDto {
  return {
    id: row.id,
    trackId: row.trackId,
    splitIndex: row.splitIndex,
    name: row.name,
  };
}

export function getTrackSplits(trackId: string): TrackSplitDto[] {
  const rows = getDb()
    .prepare(
      `SELECT id, trackId, splitIndex, name, createdAt, updatedAt
       FROM track_splits WHERE trackId = ? ORDER BY splitIndex`,
    )
    .all(trackId) as TrackSplitRow[];
  return rows.map(rowToDto);
}

export function getTrackSplitsByName(trackName: string, userId: string): TrackSplitDto[] {
  const track = getDb()
    .prepare(`SELECT id FROM tracks WHERE name = ? AND userId = ?`)
    .get(trackName, userId) as { id: string } | undefined;
  if (!track) return [];
  return getTrackSplits(track.id);
}

export function replaceTrackSplits(
  trackId: string,
  splits: { name: string }[],
): TrackSplitDto[] {
  const track = getDb()
    .prepare(`SELECT id FROM tracks WHERE id = ?`)
    .get(trackId);
  if (!track) {
    throw Object.assign(new Error("Track not found"), { code: "NOT_FOUND" });
  }

  const names = splits.map((s) => s.name.trim());
  if (names.some((name) => !name)) {
    throw Object.assign(new Error("Each split needs a name"), { code: "VALIDATION" });
  }

  const now = new Date().toISOString();
  const db = getDb();
  const replace = db.transaction(() => {
    db.prepare(`DELETE FROM track_splits WHERE trackId = ?`).run(trackId);
    const insert = db.prepare(
      `INSERT INTO track_splits (id, trackId, splitIndex, name, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    names.forEach((name, index) => {
      insert.run(randomUUID(), trackId, index + 1, name, now, now);
    });
    db.prepare(`UPDATE tracks SET updatedAt = ? WHERE id = ?`).run(now, trackId);
  });
  replace();

  return getTrackSplits(trackId);
}
