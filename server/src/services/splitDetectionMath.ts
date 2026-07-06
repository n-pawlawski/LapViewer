import { bestBankScore } from "./lapDetectionMath.js";

export interface SplitDetectionProposal {
  splitIndex: number;
  timeSeconds: number;
  score: number;
  confidence: number;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** Best full-frame NCC match within [searchStartSec, searchEndSec]. */
export function detectSplitInScan(
  frameTimes: number[],
  frameGrays: Uint8Array[],
  bankTemplates: Uint8Array[],
  searchStartSec: number,
  searchEndSec: number,
  minNcc = 0.35,
): { timeSeconds: number; score: number } | null {
  if (bankTemplates.length === 0 || searchStartSec > searchEndSec) return null;

  let best: { timeSeconds: number; score: number } | null = null;
  for (let i = 0; i < frameTimes.length; i++) {
    const timeSeconds = frameTimes[i]!;
    if (timeSeconds < searchStartSec || timeSeconds > searchEndSec) continue;
    const score = bestBankScore(frameGrays[i]!, bankTemplates);
    if (score >= minNcc && (!best || score > best.score)) {
      best = { timeSeconds, score };
    }
  }
  return best;
}

/**
 * A split slot is missing when there is no marker assigned to that splitIndex,
 * or the assigned marker is outside marginSec of the bank-derived expected time.
 * Markers cannot satisfy multiple slots — each splitIndex is checked independently.
 */
export function missingSplitIndicesForLap(
  lapStartSec: number,
  lapSplits: Array<{ splitIndex: number; timeSeconds: number }>,
  trackSplits: Array<{ splitIndex: number }>,
  medianOffsetBySplitIndex: Map<number, number> | Record<number, number>,
  marginSec = 4,
): number[] {
  const offsetMap =
    medianOffsetBySplitIndex instanceof Map
      ? medianOffsetBySplitIndex
      : new Map(Object.entries(medianOffsetBySplitIndex).map(([k, v]) => [Number(k), v]));

  const missing: number[] = [];
  for (const trackSplit of [...trackSplits].sort((a, b) => a.splitIndex - b.splitIndex)) {
    const assigned = lapSplits.find((s) => s.splitIndex === trackSplit.splitIndex);
    if (!assigned) {
      missing.push(trackSplit.splitIndex);
      continue;
    }

    const medianOffset = offsetMap.get(trackSplit.splitIndex);
    if (medianOffset == null) continue;

    const expectedSec = lapStartSec + medianOffset;
    if (Math.abs(assigned.timeSeconds - expectedSec) > marginSec) {
      missing.push(trackSplit.splitIndex);
    }
  }
  return missing;
}

function orderMissingByTrackTime(
  missingSplitIndices: number[],
  medianOffsetBySplitIndex: Map<number, number>,
): number[] {
  return [...missingSplitIndices].sort((a, b) => {
    const ma = medianOffsetBySplitIndex.get(a);
    const mb = medianOffsetBySplitIndex.get(b);
    if (ma != null && mb != null) return ma - mb;
    if (ma != null) return -1;
    if (mb != null) return 1;
    return a - b;
  });
}

function findSplitMatch(
  frameTimes: number[],
  frameGrays: Uint8Array[],
  templates: Uint8Array[],
  lapStartSec: number,
  lapEndSec: number,
  expectedSec: number,
  searchFromSec: number,
  searchMarginSec: number,
  minNcc: number,
): { timeSeconds: number; score: number } | null {
  const primaryStart = Math.max(lapStartSec + 0.05, expectedSec - searchMarginSec);
  const primaryEnd = Math.min(lapEndSec - 0.05, expectedSec + searchMarginSec);
  const minStart = Math.max(lapStartSec + 0.05, searchFromSec);
  const lapEnd = lapEndSec - 0.05;

  const windows: Array<[number, number, number]> = [
    [Math.max(primaryStart, minStart), primaryEnd, minNcc],
    [minStart, lapEnd, minNcc],
    [minStart, lapEnd, minNcc * 0.65],
  ];

  for (const [start, end, threshold] of windows) {
    const match = detectSplitInScan(frameTimes, frameGrays, templates, start, end, threshold);
    if (match && match.timeSeconds >= minStart - 0.001) {
      return match;
    }
  }
  return null;
}

export function buildSplitDetectionProposals(input: {
  missingSplitIndices: number[];
  frameTimes: number[];
  frameGrays: Uint8Array[];
  bankBySplitIndex: Map<number, Uint8Array[]>;
  medianOffsetBySplitIndex: Map<number, number>;
  lapStartSec: number;
  lapEndSec: number;
  searchMarginSec?: number;
  minNcc?: number;
  minGapSec?: number;
}): SplitDetectionProposal[] {
  const {
    missingSplitIndices,
    frameTimes,
    frameGrays,
    bankBySplitIndex,
    medianOffsetBySplitIndex,
    lapStartSec,
    lapEndSec,
    searchMarginSec = 4,
    minNcc = 0.35,
    minGapSec = 0.15,
  } = input;

  const ordered = orderMissingByTrackTime(missingSplitIndices, medianOffsetBySplitIndex);
  const proposals: SplitDetectionProposal[] = [];
  let searchFromSec = lapStartSec + 0.05;

  for (const splitIndex of ordered) {
    const templates = bankBySplitIndex.get(splitIndex) ?? [];
    if (templates.length === 0) continue;

    const medianOffset = medianOffsetBySplitIndex.get(splitIndex);
    const expectedSec =
      medianOffset != null ? lapStartSec + medianOffset : (lapStartSec + lapEndSec) / 2;

    const match = findSplitMatch(
      frameTimes,
      frameGrays,
      templates,
      lapStartSec,
      lapEndSec,
      expectedSec,
      searchFromSec,
      searchMarginSec,
      minNcc,
    );
    if (!match) continue;

    proposals.push({
      splitIndex,
      timeSeconds: match.timeSeconds,
      score: match.score,
      confidence: Math.min(1, Math.max(0, match.score)),
    });
    searchFromSec = match.timeSeconds + minGapSec;
  }

  return proposals;
}
