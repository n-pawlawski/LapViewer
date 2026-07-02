import type { SelectedLap } from "../context/CompareContext";
import type { ComparePaneWindow } from "./compare";

const EPSILON = 0.001;

export interface ComparisonChartBoundary {
  comparisonTime: number;
  label: string;
  splitIndex?: number;
}

export interface ComparisonChartSegment {
  startComparisonTime: number;
  endComparisonTime: number;
  durationSeconds: number;
  endLabel: string;
}

export interface ComparisonChartPaneSeries {
  label: string;
  lapTimeMs: number;
  segments: ComparisonChartSegment[];
  boundaries: ComparisonChartBoundary[];
}

export interface ComparisonSector {
  index: number;
  label: string;
  fromLabel: string;
  lap1Seconds: number;
  lap2Seconds: number;
  deltaSeconds: number;
  /** Which lap was faster in this sector: 0 = lap 1, 1 = lap 2, null = tie. */
  winner: 0 | 1 | null;
}

export interface ComparisonChartData {
  maxDuration: number;
  panes: [ComparisonChartPaneSeries | null, ComparisonChartPaneSeries | null];
  sectors: ComparisonSector[];
  splitGuides: ComparisonChartBoundary[];
  cumulativeFinishDelta: number;
}

function paneLabel(pane: SelectedLap): string {
  const title = pane.session.title;
  const short = title.length > 22 ? `${title.slice(0, 20)}…` : title;
  return `${short} · L${pane.lap.lapNumber}`;
}

function buildPaneSeries(
  pane: SelectedLap,
  window: ComparePaneWindow | null,
): ComparisonChartPaneSeries | null {
  if (!window || window.durationSeconds <= 0) return null;

  const lapSplits = pane.splits.filter((split) => split.lapNumber === pane.lap.lapNumber);
  const orderedTrack = [...pane.trackSplits].sort((a, b) => a.splitIndex - b.splitIndex);
  const windowStart = window.startSeconds;

  const boundaries: ComparisonChartBoundary[] = [{ comparisonTime: 0, label: "Start" }];

  for (const trackSplit of orderedTrack) {
    const split = lapSplits.find((s) => s.splitIndex === trackSplit.splitIndex);
    if (!split) continue;
    const rel = split.timeSeconds - windowStart;
    if (rel <= EPSILON || rel >= window.durationSeconds - EPSILON) continue;
    boundaries.push({
      comparisonTime: rel,
      label: trackSplit.name,
      splitIndex: trackSplit.splitIndex,
    });
  }

  boundaries.push({ comparisonTime: window.durationSeconds, label: "Finish" });
  boundaries.sort((a, b) => a.comparisonTime - b.comparisonTime);

  const segments: ComparisonChartSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i].comparisonTime;
    const end = boundaries[i + 1].comparisonTime;
    segments.push({
      startComparisonTime: start,
      endComparisonTime: end,
      durationSeconds: end - start,
      endLabel: boundaries[i + 1].label,
    });
  }

  return {
    label: paneLabel(pane),
    lapTimeMs: pane.lap.lapTimeMs,
    segments,
    boundaries,
  };
}

function mergeSplitGuides(
  panes: [ComparisonChartPaneSeries | null, ComparisonChartPaneSeries | null],
): ComparisonChartBoundary[] {
  const byIndex = new Map<number, { label: string; times: number[] }>();

  for (const pane of panes) {
    if (!pane) continue;
    for (const boundary of pane.boundaries) {
      if (boundary.splitIndex == null) continue;
      const entry = byIndex.get(boundary.splitIndex) ?? {
        label: boundary.label,
        times: [],
      };
      entry.times.push(boundary.comparisonTime);
      byIndex.set(boundary.splitIndex, entry);
    }
  }

  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([splitIndex, { label, times }]) => ({
      splitIndex,
      label,
      comparisonTime: times.reduce((sum, t) => sum + t, 0) / times.length,
    }));
}

/** Pair segments by index and compute per-sector time differences (lap 2 − lap 1). */
function buildSectors(
  reference: ComparisonChartPaneSeries,
  other: ComparisonChartPaneSeries,
): ComparisonSector[] {
  const count = Math.min(reference.segments.length, other.segments.length);
  const sectors: ComparisonSector[] = [];

  for (let i = 0; i < count; i++) {
    const lap1 = reference.segments[i];
    const lap2 = other.segments[i];
    const delta = lap2.durationSeconds - lap1.durationSeconds;
    const winner: 0 | 1 | null =
      Math.abs(delta) < 0.005 ? null : delta < 0 ? 1 : 0;
    sectors.push({
      index: i,
      label: lap1.endLabel,
      fromLabel: reference.boundaries[i]?.label ?? "Start",
      lap1Seconds: lap1.durationSeconds,
      lap2Seconds: lap2.durationSeconds,
      deltaSeconds: delta,
      winner,
    });
  }

  return sectors;
}

export function buildComparisonChartData(
  panes: [SelectedLap, SelectedLap],
  windows: [ComparePaneWindow | null, ComparePaneWindow | null],
): ComparisonChartData | null {
  const series0 = buildPaneSeries(panes[0], windows[0]);
  const series1 = buildPaneSeries(panes[1], windows[1]);
  if (!series0 || !series1) return null;

  const maxDuration = Math.max(
    series0.boundaries[series0.boundaries.length - 1]?.comparisonTime ?? 0,
    series1.boundaries[series1.boundaries.length - 1]?.comparisonTime ?? 0,
    0.001,
  );

  const sectors = buildSectors(series0, series1);
  const cumulativeFinishDelta = sectors.reduce((sum, s) => sum + s.deltaSeconds, 0);

  return {
    maxDuration,
    panes: [series0, series1],
    sectors,
    splitGuides: mergeSplitGuides([series0, series1]),
    cumulativeFinishDelta,
  };
}

/** Format signed delta seconds for chart labels (e.g. +0.12, −0.05). */
export function formatChartDelta(seconds: number): string {
  if (Math.abs(seconds) < 0.005) return "0.00";
  const sign = seconds < 0 ? "−" : "+";
  return `${sign}${Math.abs(seconds).toFixed(2)}`;
}

/** Format segment duration for strip labels. */
export function formatSegmentDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toFixed(1)}`;
}
