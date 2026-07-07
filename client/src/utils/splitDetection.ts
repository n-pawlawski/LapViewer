/** Mirror of server missingSplitIndicesForLap — keep in sync. */
export function missingSplitIndicesForLap(
  lapStartSec: number,
  lapSplits: Array<{ splitIndex: number; timeSeconds: number }>,
  trackSplits: Array<{ splitIndex: number }>,
  medianOffsetBySplitIndex: Record<number, number>,
  marginSec = 4,
): number[] {
  const missing: number[] = [];
  for (const trackSplit of [...trackSplits].sort((a, b) => a.splitIndex - b.splitIndex)) {
    const assigned = lapSplits.find((s) => s.splitIndex === trackSplit.splitIndex);
    if (!assigned) {
      missing.push(trackSplit.splitIndex);
      continue;
    }

    const medianOffset = medianOffsetBySplitIndex[trackSplit.splitIndex];
    if (medianOffset == null) continue;

    const expectedSec = lapStartSec + medianOffset;
    if (Math.abs(assigned.timeSeconds - expectedSec) > marginSec) {
      missing.push(trackSplit.splitIndex);
    }
  }
  return missing;
}

export interface LapMissingSplits {
  lapNumber: number;
  missingSplitIndices: number[];
}

export function bankCoversMissingSplits(
  missingSplitIndices: number[],
  bySplitIndex: Record<number, number> | undefined,
): boolean {
  if (missingSplitIndices.length === 0 || !bySplitIndex) return false;
  return missingSplitIndices.every((idx) => (bySplitIndex[idx] ?? 0) > 0);
}

export function lapsWithSuggestibleMissingSplits(input: {
  laps: Array<{ lapNumber: number; startSeconds: number }>;
  splitsByLap: Map<number, Array<{ splitIndex: number; timeSeconds: number }>>;
  trackSplits: Array<{ splitIndex: number }>;
  medianOffsetBySplitIndex: Record<number, number> | undefined;
  bySplitIndex: Record<number, number> | undefined;
}): LapMissingSplits[] {
  const { laps, splitsByLap, trackSplits, medianOffsetBySplitIndex, bySplitIndex } = input;
  const result: LapMissingSplits[] = [];

  for (const lap of laps) {
    const lapSplits = splitsByLap.get(lap.lapNumber) ?? [];
    const missingSplitIndices =
      medianOffsetBySplitIndex && Object.keys(medianOffsetBySplitIndex).length > 0
        ? missingSplitIndicesForLap(
            lap.startSeconds,
            lapSplits,
            trackSplits,
            medianOffsetBySplitIndex,
          )
        : trackSplits
            .map((ts) => ts.splitIndex)
            .filter((splitIndex) => !lapSplits.some((s) => s.splitIndex === splitIndex));

    if (
      missingSplitIndices.length > 0 &&
      bankCoversMissingSplits(missingSplitIndices, bySplitIndex)
    ) {
      result.push({ lapNumber: lap.lapNumber, missingSplitIndices });
    }
  }

  return result;
}
