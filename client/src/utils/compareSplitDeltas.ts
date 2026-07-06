import type { SelectedLap } from "../context/CompareContext";
import { formatLapTime } from "./time";
import { splitSegmentMs, splitsByLapNumber, tailSegmentMs } from "./splits";

export interface SplitDeltaRow {
  label: string;
  lapAMs: number | null;
  lapBMs: number | null;
  deltaMs: number | null;
  isTotal?: boolean;
}

function formatDelta(deltaMs: number | null): string {
  if (deltaMs == null) return "—";
  if (Math.abs(deltaMs) < 1) return "—";
  const sign = deltaMs > 0 ? "+" : "−";
  const absSec = Math.abs(deltaMs) / 1000;
  return `${sign}${absSec.toFixed(3)} ${deltaMs > 0 ? "lost" : "gained"}`;
}

export function buildSplitDeltaRows(
  paneA: SelectedLap,
  paneB: SelectedLap,
): SplitDeltaRow[] {
  const trackSplits = [...paneA.trackSplits].sort((a, b) => a.splitIndex - b.splitIndex);
  if (trackSplits.length === 0) return [];

  const splitsA = splitsByLapNumber(paneA.splits).get(paneA.lap.lapNumber) ?? [];
  const splitsB = splitsByLapNumber(paneB.splits).get(paneB.lap.lapNumber) ?? [];

  const rows: SplitDeltaRow[] = [];
  let priorA: (typeof splitsA)[number] | undefined;
  let priorB: (typeof splitsB)[number] | undefined;

  for (const trackSplit of trackSplits) {
    const splitA = splitsA.find((s) => s.splitIndex === trackSplit.splitIndex);
    const splitB = splitsB.find((s) => s.splitIndex === trackSplit.splitIndex);

    const lapAMs =
      splitA != null
        ? splitSegmentMs(splitA, paneA.lap.startSeconds, priorA)
        : null;
    const lapBMs =
      splitB != null
        ? splitSegmentMs(splitB, paneB.lap.startSeconds, priorB)
        : null;

    const deltaMs =
      lapAMs != null && lapBMs != null ? lapBMs - lapAMs : null;

    const priorName = priorA?.label ?? "start";
    rows.push({
      label: `${priorName} → ${trackSplit.name}`,
      lapAMs,
      lapBMs,
      deltaMs,
    });

    if (splitA) priorA = splitA;
    if (splitB) priorB = splitB;
  }

  const lastA = splitsA[splitsA.length - 1];
  const lastB = splitsB[splitsB.length - 1];
  const tailA = tailSegmentMs(paneA.lap.startSeconds, paneA.lap.endSeconds, lastA);
  const tailB = tailSegmentMs(paneB.lap.startSeconds, paneB.lap.endSeconds, lastB);

  rows.push({
    label: "Total lap",
    lapAMs: paneA.lap.lapTimeMs,
    lapBMs: paneB.lap.lapTimeMs,
    deltaMs: paneB.lap.lapTimeMs - paneA.lap.lapTimeMs,
    isTotal: true,
  });

  if (lastA || lastB) {
    rows.splice(rows.length - 1, 0, {
      label: `${lastA?.label ?? lastB?.label ?? "last split"} → finish`,
      lapAMs: lastA ? tailA : null,
      lapBMs: lastB ? tailB : null,
      deltaMs: lastA && lastB ? tailB - tailA : null,
    });
  }

  return rows;
}

export function formatDeltaCell(deltaMs: number | null): string {
  return formatDelta(deltaMs);
}

export function formatSectorCell(ms: number | null): string {
  if (ms == null) return "—";
  return formatLapTime(ms);
}
