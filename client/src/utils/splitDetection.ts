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
