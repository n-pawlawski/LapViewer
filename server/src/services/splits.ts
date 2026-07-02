import type { LapDto, SplitDto, TrackSplitDto } from "../types.js";
import { getDb } from "../db/database.js";

const EPSILON = 0.001;

function nowIso(): string {
  return new Date().toISOString();
}

export interface SplitMarkerInput {
  id: string;
  timeSeconds: number;
  label: string | null;
  splitIndex: number | null;
}

/** Map split markers to track-defined slots within each lap. */
export function assignSplitsToLaps(
  sessionId: string,
  splitMarkers: SplitMarkerInput[],
  laps: LapDto[],
  trackSplits: TrackSplitDto[],
): SplitDto[] {
  const result: SplitDto[] = [];

  for (const lap of laps) {
    const inLap = splitMarkers.filter(
      (s) =>
        s.timeSeconds > lap.startSeconds + EPSILON &&
        s.timeSeconds < lap.endSeconds - EPSILON,
    );

    if (trackSplits.length > 0) {
      for (const trackSplit of trackSplits) {
        const marker = inLap.find((s) => s.splitIndex === trackSplit.splitIndex);
        if (marker) {
          result.push({
            id: marker.id,
            sessionId,
            lapNumber: lap.lapNumber,
            splitIndex: trackSplit.splitIndex,
            timeSeconds: marker.timeSeconds,
            label: trackSplit.name,
          });
        }
      }
      continue;
    }

    const ordered = [...inLap].sort((a, b) => a.timeSeconds - b.timeSeconds);
    ordered.forEach((split, index) => {
      const splitIndex = split.splitIndex ?? index + 1;
      result.push({
        id: split.id,
        sessionId,
        lapNumber: lap.lapNumber,
        splitIndex,
        timeSeconds: split.timeSeconds,
        label: split.label ?? `s${splitIndex}`,
      });
    });
  }

  return result;
}

export function lapBoundsForNumber(
  laps: LapDto[],
  lapNumber: number,
): { startSeconds: number; endSeconds: number } | null {
  const lap = laps.find((l) => l.lapNumber === lapNumber);
  if (!lap) return null;
  return { startSeconds: lap.startSeconds, endSeconds: lap.endSeconds };
}

export function assertTimeInsideLap(
  timeSeconds: number,
  startSeconds: number,
  endSeconds: number,
): void {
  if (
    !Number.isFinite(timeSeconds) ||
    timeSeconds <= startSeconds + EPSILON ||
    timeSeconds >= endSeconds - EPSILON
  ) {
    throw Object.assign(
      new Error("Split must be strictly inside the selected lap"),
      { code: "VALIDATION" },
    );
  }
}

export function findLapForSplitTime(
  laps: LapDto[],
  timeSeconds: number,
): LapDto | null {
  for (const lap of laps) {
    if (
      timeSeconds > lap.startSeconds + EPSILON &&
      timeSeconds < lap.endSeconds - EPSILON
    ) {
      return lap;
    }
  }
  return null;
}

export function findSplitMarkerInLap(
  splitMarkers: SplitMarkerInput[],
  laps: LapDto[],
  lapNumber: number,
  splitIndex: number,
): SplitMarkerInput | undefined {
  const lap = laps.find((l) => l.lapNumber === lapNumber);
  if (!lap) return undefined;

  return splitMarkers.find(
    (marker) =>
      marker.splitIndex === splitIndex &&
      marker.timeSeconds > lap.startSeconds + EPSILON &&
      marker.timeSeconds < lap.endSeconds - EPSILON,
  );
}

/** Reassign splitIndex labels by chronological order within a lap (1st time → 1st track slot, etc.). */
export function rebalanceLapSplitIndices(
  sessionId: string,
  lapNumber: number,
  laps: LapDto[],
  trackSplits: TrackSplitDto[],
): void {
  const bounds = lapBoundsForNumber(laps, lapNumber);
  if (!bounds || trackSplits.length === 0) return;

  const orderedTrack = [...trackSplits].sort((a, b) => a.splitIndex - b.splitIndex);
  const db = getDb();

  const markers = db
    .prepare(`SELECT id, timeSeconds FROM markers WHERE sessionId = ? AND kind = 'split'`)
    .all(sessionId) as Array<{ id: string; timeSeconds: number }>;

  const inLap = markers
    .filter(
      (marker) =>
        marker.timeSeconds > bounds.startSeconds + EPSILON &&
        marker.timeSeconds < bounds.endSeconds - EPSILON,
    )
    .sort((a, b) => a.timeSeconds - b.timeSeconds);

  if (inLap.length === 0) return;

  const assignCount = Math.min(inLap.length, orderedTrack.length);
  const ts = nowIso();
  const clearStmt = db.prepare(
    `UPDATE markers SET splitIndex = NULL, updatedAt = ? WHERE id = ?`,
  );
  const assignStmt = db.prepare(
    `UPDATE markers SET splitIndex = ?, label = ?, updatedAt = ? WHERE id = ?`,
  );

  const rebalance = db.transaction(() => {
    for (const marker of inLap) {
      clearStmt.run(ts, marker.id);
    }
    for (let i = 0; i < assignCount; i++) {
      const trackSplit = orderedTrack[i];
      assignStmt.run(trackSplit.splitIndex, trackSplit.name, ts, inLap[i].id);
    }
  });
  rebalance();
}

/** Rebalance every lap in a session (e.g. on load to fix legacy slot assignments). */
export function rebalanceSessionSplitIndices(
  sessionId: string,
  laps: LapDto[],
  trackSplits: TrackSplitDto[],
): void {
  if (trackSplits.length === 0) return;
  for (const lap of laps) {
    rebalanceLapSplitIndices(sessionId, lap.lapNumber, laps, trackSplits);
  }
}
