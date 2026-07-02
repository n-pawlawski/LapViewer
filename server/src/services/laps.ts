import type { LapDto } from "../types.js";

export interface MarkerInput {
  id: string;
  timeSeconds: number;
  ignored?: boolean;
}

/** Compute laps from ordered lap-start markers. */
export function computeLaps(
  sessionId: string,
  markers: MarkerInput[],
  durationSeconds: number | null,
): LapDto[] {
  const sorted = [...markers].sort((a, b) => a.timeSeconds - b.timeSeconds);
  if (sorted.length === 0) return [];

  const laps: LapDto[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i].timeSeconds;
    const end = sorted[i + 1].timeSeconds;
    const lapNumber = i + 1;
    laps.push({
      id: `${sessionId}-lap-${lapNumber}`,
      sessionId,
      lapNumber,
      startSeconds: start,
      endSeconds: end,
      lapTimeMs: Math.round((end - start) * 1000),
      ignored: Boolean(sorted[i].ignored),
    });
  }

  const lastMarker = sorted[sorted.length - 1];
  if (durationSeconds != null && durationSeconds > lastMarker.timeSeconds) {
    const lapNumber = sorted.length;
    laps.push({
      id: `${sessionId}-lap-${lapNumber}`,
      sessionId,
      lapNumber,
      startSeconds: lastMarker.timeSeconds,
      endSeconds: durationSeconds,
      lapTimeMs: Math.round((durationSeconds - lastMarker.timeSeconds) * 1000),
      ignored: Boolean(lastMarker.ignored),
    });
  }

  return laps;
}

export function bestLapTimeMs(laps: LapDto[]): number | undefined {
  const counted = laps.filter((lap) => !lap.ignored);
  if (counted.length === 0) return undefined;
  return Math.min(...counted.map((l) => l.lapTimeMs));
}
