import { randomUUID } from "node:crypto";
import { getDb } from "../db/database.js";
import { extractFullFrameGrayFromVideo } from "./lapDetection.js";
import { getSessionById, getSessionSourcePath } from "./sessions.js";
import { getTrackById, getTrackByName } from "./tracks.js";
import { findLapForSplitTime } from "./splits.js";
import type { SplitBankSummaryDto } from "../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function lapStartForSplitTime(
  sessionId: string,
  timeSeconds: number,
  userId: string,
): number | null {
  const session = getSessionById(sessionId, userId);
  if (!session) return null;
  const lap = findLapForSplitTime(session.laps, timeSeconds);
  return lap?.startSeconds ?? null;
}

export function listSplitBankTemplates(
  trackId: string,
  splitIndex: number,
): Uint8Array[] {
  const rows = getDb()
    .prepare(
      `SELECT frameGray FROM track_split_bank WHERE trackId = ? AND splitIndex = ?`,
    )
    .all(trackId, splitIndex) as Array<{ frameGray: Buffer }>;
  return rows.map((row) => new Uint8Array(row.frameGray));
}

export function medianLapOffsetForSplit(trackId: string, splitIndex: number): number | null {
  const rows = getDb()
    .prepare(
      `SELECT lapOffsetSeconds FROM track_split_bank WHERE trackId = ? AND splitIndex = ?`,
    )
    .all(trackId, splitIndex) as Array<{ lapOffsetSeconds: number }>;
  if (rows.length === 0) return null;
  const sorted = rows.map((r) => r.lapOffsetSeconds).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

export function getSplitBankSummary(trackId: string, userId: string): SplitBankSummaryDto {
  backfillSplitBankFromTrack(trackId, userId);

  const track = getTrackById(trackId, userId);

  const rows = getDb()
    .prepare(
      `SELECT splitIndex, COUNT(*) AS count FROM track_split_bank
       WHERE trackId = ? GROUP BY splitIndex ORDER BY splitIndex`,
    )
    .all(trackId) as Array<{ splitIndex: number; count: number }>;

  const bySplitIndex: Record<number, number> = {};
  const medianOffsetBySplitIndex: Record<number, number> = {};
  let totalEntries = 0;
  for (const row of rows) {
    bySplitIndex[row.splitIndex] = row.count;
    totalEntries += row.count;
  }

  for (const trackSplit of track?.splits ?? []) {
    const median = medianLapOffsetForSplit(trackId, trackSplit.splitIndex);
    if (median != null) {
      medianOffsetBySplitIndex[trackSplit.splitIndex] = median;
    }
  }

  return { trackId, bySplitIndex, medianOffsetBySplitIndex, totalEntries };
}

export function removeSplitBankEntryByMarkerId(markerId: string): void {
  getDb().prepare(`DELETE FROM track_split_bank WHERE sourceMarkerId = ?`).run(markerId);
}

export async function upsertSplitBankEntryForMarker(
  markerId: string,
  userId: string,
): Promise<void> {
  const row = getDb()
    .prepare(
      `SELECT id, sessionId, timeSeconds, kind, splitIndex FROM markers WHERE id = ? AND kind = 'split'`,
    )
    .get(markerId) as
    | {
        id: string;
        sessionId: string;
        timeSeconds: number;
        kind: string;
        splitIndex: number | null;
      }
    | undefined;

  if (!row) return;

  const session = getSessionById(row.sessionId, userId);
  if (!session?.track) return;

  const track = getTrackByName(session.track, userId);
  if (!track) return;

  let splitIndex = row.splitIndex;
  if (splitIndex == null) {
    const split = session.splits.find((s) => s.id === markerId);
    splitIndex = split?.splitIndex ?? null;
  }
  if (splitIndex == null) return;

  const lapStart = lapStartForSplitTime(row.sessionId, row.timeSeconds, userId);
  if (lapStart == null) return;

  const sourcePath = getSessionSourcePath(row.sessionId, userId);
  if (!sourcePath) return;

  const frameGray = await extractFullFrameGrayFromVideo(sourcePath, row.timeSeconds);
  const lapOffsetSeconds = row.timeSeconds - lapStart;
  const ts = nowIso();

  const existing = getDb()
    .prepare(`SELECT id FROM track_split_bank WHERE sourceMarkerId = ?`)
    .get(markerId) as { id: string } | undefined;

  if (existing) {
    getDb()
      .prepare(
        `UPDATE track_split_bank
         SET timeSeconds = ?, lapOffsetSeconds = ?, frameGray = ?, splitIndex = ?, confirmedAt = ?
         WHERE sourceMarkerId = ?`,
      )
      .run(
        row.timeSeconds,
        lapOffsetSeconds,
        frameGray,
        splitIndex,
        ts,
        markerId,
      );
    return;
  }

  getDb()
    .prepare(
      `INSERT INTO track_split_bank (
        id, trackId, splitIndex, sourceMarkerId, sourceSessionId,
        timeSeconds, lapOffsetSeconds, frameGray, confirmedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      track.id,
      splitIndex,
      markerId,
      row.sessionId,
      row.timeSeconds,
      lapOffsetSeconds,
      frameGray,
      ts,
      ts,
    );
}

export function backfillSplitBankFromTrack(trackId: string, userId: string): void {
  const track = getTrackById(trackId, userId);
  if (!track) return;

  const markers = getDb()
    .prepare(
      `SELECT m.id, m.sessionId, m.timeSeconds, m.splitIndex
       FROM markers m
       JOIN sessions s ON s.id = m.sessionId
       WHERE m.kind = 'split' AND s.trackName = ? AND s.userId = ?
       ORDER BY m.timeSeconds`,
    )
    .all(track.name, userId) as Array<{
    id: string;
    sessionId: string;
    timeSeconds: number;
    splitIndex: number | null;
  }>;

  for (const marker of markers) {
    const hasEntry = getDb()
      .prepare(`SELECT 1 FROM track_split_bank WHERE sourceMarkerId = ?`)
      .get(marker.id);
    if (hasEntry) continue;

    void upsertSplitBankEntryForMarker(marker.id, userId).catch(() => {
      // Video may be offline; skip silently during summary fetch.
    });
  }
}

export function trackHasBankDataForSplitIndices(
  trackId: string,
  splitIndices: number[],
): boolean {
  if (splitIndices.length === 0) return false;
  for (const splitIndex of splitIndices) {
    const row = getDb()
      .prepare(
        `SELECT COUNT(*) AS count FROM track_split_bank WHERE trackId = ? AND splitIndex = ?`,
      )
      .get(trackId, splitIndex) as { count: number };
    if (row.count === 0) return false;
  }
  return true;
}
