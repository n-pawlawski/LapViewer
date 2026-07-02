import type { SessionDetail } from "../api/sessions";
import type { Lap, Split } from "../types";
import type { SelectedLap } from "../context/CompareContext";

export type CompareSyncPoint =  | { type: "lapStart"; label: string }
  | { type: "split"; splitIndex: number; label: string };

export interface ComparePaneWindow {
  startSeconds: number;
  durationSeconds: number;
}

export function compareWindowForLap(
  lap: Lap,
  splits: Split[],
  syncPoint: CompareSyncPoint,
): ComparePaneWindow | null {
  if (syncPoint.type === "lapStart") {
    const durationSeconds = lap.endSeconds - lap.startSeconds;
    if (durationSeconds <= 0) return null;
    return { startSeconds: lap.startSeconds, durationSeconds };
  }

  const split = splits.find(
    (s) => s.lapNumber === lap.lapNumber && s.splitIndex === syncPoint.splitIndex,
  );
  if (!split) return null;

  const durationSeconds = lap.endSeconds - split.timeSeconds;
  if (durationSeconds <= 0) return null;

  return { startSeconds: split.timeSeconds, durationSeconds };
}

export function availableSyncPoints(panes: [SelectedLap, SelectedLap]): CompareSyncPoint[] {
  const points: CompareSyncPoint[] = [{ type: "lapStart", label: "Lap start" }];

  const trackSplitsByIndex = new Map<number, string>();
  for (const pane of panes) {
    for (const ts of pane.trackSplits) {
      trackSplitsByIndex.set(ts.splitIndex, ts.name);
    }
  }

  const splitIndices = [...trackSplitsByIndex.keys()].sort((a, b) => a - b);
  for (const splitIndex of splitIndices) {
    const bothMarked = panes.every((pane) =>
      pane.splits.some(
        (s) => s.lapNumber === pane.lap.lapNumber && s.splitIndex === splitIndex,
      ),
    );
    if (bothMarked) {
      points.push({
        type: "split",
        splitIndex,
        label: trackSplitsByIndex.get(splitIndex) ?? `s${splitIndex}`,
      });
    }
  }

  return points;
}

export function syncPointFromParam(
  value: string | null,
  options: CompareSyncPoint[],
): CompareSyncPoint {
  if (!value || value === "lap") {
    return options[0] ?? { type: "lapStart", label: "Lap start" };
  }
  if (value.startsWith("split:")) {
    const splitIndex = Number(value.slice("split:".length));
    const match = options.find(
      (p) => p.type === "split" && p.splitIndex === splitIndex,
    );
    if (match) return match;
  }
  return options[0] ?? { type: "lapStart", label: "Lap start" };
}

export function syncPointToParam(point: CompareSyncPoint): string {
  if (point.type === "lapStart") return "lap";
  return `split:${point.splitIndex}`;
}

export function buildPaneWindows(
  panes: [SelectedLap, SelectedLap],
  syncPoint: CompareSyncPoint,
): [ComparePaneWindow | null, ComparePaneWindow | null] {
  return [
    compareWindowForLap(panes[0].lap, panes[0].splits, syncPoint),
    compareWindowForLap(panes[1].lap, panes[1].splits, syncPoint),
  ];
}

export interface AdjustableMarker {
  markerId: string;
  timeSeconds: number;
  label: string;
}

export function buildSelectedLap(detail: SessionDetail, lap: Lap): SelectedLap {
  return {
    lap,
    session: {
      id: detail.id,
      title: detail.title,
      sourcePath: detail.sourcePath,
      status: detail.status,
      track: detail.track,
      date: detail.date,
      lapCount: detail.lapCount,
      bestLapTimeMs: detail.bestLapTimeMs,
      usesDemoStream: detail.status === "ready",
    },
    splits: detail.splits ?? [],
    trackSplits: detail.trackSplits ?? [],
    lapStartMarkerId: detail.markers[lap.lapNumber - 1]?.id ?? null,
  };
}

export function selectedLapFromDetail(detail: SessionDetail, lapId: string): SelectedLap | null {
  const lap = detail.laps.find((l) => l.id === lapId);
  if (!lap) return null;
  return buildSelectedLap(detail, lap);
}

/** Marker or split aligned with the paused playhead (within half a frame). */
export function findAdjustableMarkerAtTime(
  pane: SelectedLap,
  absoluteTimeSeconds: number,
  frameStepSeconds: number,
): AdjustableMarker | null {
  const tolerance = frameStepSeconds * 0.51;
  const candidates: AdjustableMarker[] = [];

  if (pane.lapStartMarkerId) {
    candidates.push({
      markerId: pane.lapStartMarkerId,
      timeSeconds: pane.lap.startSeconds,
      label: `Lap ${pane.lap.lapNumber} start`,
    });
  }

  for (const split of pane.splits) {
    if (split.lapNumber !== pane.lap.lapNumber) continue;
    candidates.push({
      markerId: split.id,
      timeSeconds: split.timeSeconds,
      label: split.label,
    });
  }

  let best: AdjustableMarker | null = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const dist = Math.abs(candidate.timeSeconds - absoluteTimeSeconds);
    if (dist <= tolerance && dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }

  return best;
}
