import type { Lap, Split } from "../types";

const EPSILON = 0.001;

export function splitForSlot(lapSplits: Split[], splitIndex: number): Split | undefined {
  return lapSplits.find((split) => split.splitIndex === splitIndex);
}

export function nextEmptySplitIndex(
  trackSplits: { splitIndex: number }[],
  lapSplits: Split[],
): number | undefined {
  for (const trackSplit of trackSplits) {
    if (!splitForSlot(lapSplits, trackSplit.splitIndex)) {
      return trackSplit.splitIndex;
    }
  }
  return undefined;
}

export function splitsByLapNumber(splits: Split[]): Map<number, Split[]> {
  const map = new Map<number, Split[]>();
  for (const split of splits) {
    const list = map.get(split.lapNumber) ?? [];
    list.push(split);
    map.set(split.lapNumber, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.splitIndex - b.splitIndex);
  }
  return map;
}

export function lapBounds(
  laps: Lap[],
  lapNumber: number,
): { startSeconds: number; endSeconds: number } | null {
  const lap = laps.find((l) => l.lapNumber === lapNumber);
  if (!lap) return null;
  return { startSeconds: lap.startSeconds, endSeconds: lap.endSeconds };
}

export function isTimeInsideLap(
  timeSeconds: number,
  startSeconds: number,
  endSeconds: number,
): boolean {
  return (
    timeSeconds > startSeconds + EPSILON && timeSeconds < endSeconds - EPSILON
  );
}

/** Segment duration from previous boundary (lap start or prior split) to this split. */
export function splitSegmentMs(
  split: Split,
  lapStartSeconds: number,
  priorSplit: Split | undefined,
): number {
  const from = priorSplit?.timeSeconds ?? lapStartSeconds;
  return Math.round((split.timeSeconds - from) * 1000);
}

/** Duration from last split (or lap start) to lap end. */
export function tailSegmentMs(
  lapStartSeconds: number,
  lapEndSeconds: number,
  lastSplit: Split | undefined,
): number {
  const from = lastSplit?.timeSeconds ?? lapStartSeconds;
  return Math.round((lapEndSeconds - from) * 1000);
}
