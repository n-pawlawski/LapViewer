import type { LapDto, SplitDto, TrackSplitDto } from "../types.js";

const EPSILON = 0.001;

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
