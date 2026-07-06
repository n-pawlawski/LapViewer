import type { Lap, Split } from "../types";

const EPSILON = 0.001;

export function splitForSlot(lapSplits: Split[], splitIndex: number): Split | undefined {
  return lapSplits.find((split) => split.splitIndex === splitIndex);
}

/** Which track slot a new split at this time will land in (by lap-time order). */
export function splitIndexForPlacementByTime(
  timeSeconds: number,
  trackSplits: { splitIndex: number }[],
  lapSplits: Split[],
): number | undefined {
  if (trackSplits.length === 0) return undefined;
  const orderedTrack = [...trackSplits].sort((a, b) => a.splitIndex - b.splitIndex);
  const beforeCount = lapSplits.filter(
    (split) => split.timeSeconds < timeSeconds - EPSILON,
  ).length;
  if (beforeCount >= orderedTrack.length) return undefined;
  return orderedTrack[beforeCount].splitIndex;
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

/** Playhead time for marking an empty split slot — strictly inside the lap, after prior splits. */
export function seekTimeForEmptySplitSlot(
  bounds: { startSeconds: number; endSeconds: number },
  lapSplits: Split[],
  trackSplits: { splitIndex: number }[],
  splitIndex: number,
): number {
  const orderedTrack = [...trackSplits].sort((a, b) => a.splitIndex - b.splitIndex);
  const slotIdx = orderedTrack.findIndex((trackSplit) => trackSplit.splitIndex === splitIndex);
  const minTime = bounds.startSeconds + EPSILON + 0.05;
  const maxTime = bounds.endSeconds - EPSILON - 0.05;

  for (let i = (slotIdx >= 0 ? slotIdx : orderedTrack.length) - 1; i >= 0; i--) {
    const prior = splitForSlot(lapSplits, orderedTrack[i].splitIndex);
    if (prior) {
      const gap = maxTime - prior.timeSeconds;
      return Math.min(prior.timeSeconds + Math.max(0.5, gap / 2), maxTime);
    }
  }

  const lapSpan = bounds.endSeconds - bounds.startSeconds;
  return Math.min(minTime + Math.min(1, lapSpan / 3), maxTime);
}
