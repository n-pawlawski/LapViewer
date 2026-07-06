import type { Lap, Marker } from "../types";

export type IntakeViewMode = "full-race" | "only-laps";
export type IntakeLapScope = "all" | number;

export interface IntakeViewWindow {
  startSeconds: number;
  endSeconds: number;
}

export function computeIntakeViewWindow(input: {
  viewMode: IntakeViewMode;
  lapScope: IntakeLapScope;
  markers: Marker[];
  laps: Lap[];
  durationSeconds: number;
}): IntakeViewWindow {
  const { viewMode, lapScope, markers, laps, durationSeconds } = input;
  const duration = Math.max(0, durationSeconds);

  if (viewMode === "full-race" || markers.length === 0) {
    return { startSeconds: 0, endSeconds: duration || 1 };
  }

  if (typeof lapScope === "number") {
    const bounds = laps.find((lap) => lap.lapNumber === lapScope);
    if (bounds) {
      return {
        startSeconds: bounds.startSeconds,
        endSeconds: Math.max(bounds.startSeconds + 0.01, bounds.endSeconds),
      };
    }
  }

  const firstStart = markers[0]!.timeSeconds;
  const lastLap = laps[laps.length - 1];
  const endSeconds = lastLap
    ? Math.max(firstStart + 0.01, lastLap.endSeconds)
    : Math.max(firstStart + 0.01, markers[markers.length - 1]!.timeSeconds);

  return {
    startSeconds: firstStart,
    endSeconds: Math.min(duration || endSeconds, endSeconds),
  };
}

export function clampTimeToWindow(timeSeconds: number, window: IntakeViewWindow): number {
  return Math.max(window.startSeconds, Math.min(window.endSeconds, timeSeconds));
}

export function timelinePercentInWindow(
  timeSeconds: number,
  window: IntakeViewWindow,
): number {
  const span = window.endSeconds - window.startSeconds;
  if (span <= 0) return 0;
  return ((timeSeconds - window.startSeconds) / span) * 100;
}

export function isTimeInWindow(timeSeconds: number, window: IntakeViewWindow): boolean {
  return timeSeconds >= window.startSeconds && timeSeconds <= window.endSeconds;
}
