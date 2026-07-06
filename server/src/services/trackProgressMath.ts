export const WRAP_START_THRESHOLD = 0.9;
export const WRAP_END_THRESHOLD = 0.1;
export const DEFAULT_MAX_PROGRESS_JUMP_PER_SECOND = 0.12;

export interface ProgressCandidate {
  progress: number;
  visualScore: number;
}

export interface ProgressFrame {
  timestampMs: number;
  timeSec: number;
}

export interface ProgressCurvePoint {
  timestampMs: number;
  timeSec: number;
  estimatedProgress: number;
  confidence: number;
  visualScore: number;
}

export interface TrackMatchProposal {
  id: string;
  kind: "lapStart" | "split";
  timeSeconds: number;
  splitIndex?: number;
  lapNumber?: number;
  confidence: number;
}

export interface LowConfidenceRange {
  startMs: number;
  endMs: number;
  avgConfidence: number;
}

export function ncc(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let sA = 0;
  let sB = 0;
  let sAB = 0;
  let sAB2 = 0;
  let sB2 = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    sA += a[i]!;
    sB += b[i]!;
    sAB += a[i]! * b[i]!;
    sAB2 += a[i]! * a[i]!;
    sB2 += b[i]! * b[i]!;
  }
  const num = n * sAB - sA * sB;
  const den = Math.sqrt((n * sAB2 - sA * sA) * (n * sB2 - sB * sB));
  return den === 0 ? 0 : num / den;
}

export function rankCandidates(
  queryGray: Uint8Array,
  refPoints: Array<{ progress: number; gray: Uint8Array }>,
  topN = 10,
): ProgressCandidate[] {
  return refPoints
    .map((ref) => ({
      progress: ref.progress,
      visualScore: ncc(queryGray, ref.gray),
    }))
    .sort((a, b) => b.visualScore - a.visualScore)
    .slice(0, topN);
}

export function sequencePenalty(
  previous: ProgressCandidate | undefined,
  candidate: ProgressCandidate,
  dtSec: number,
  maxProgressJumpPerSecond: number,
): number {
  if (!previous) return 0;
  const prevP = previous.progress;
  const candP = candidate.progress;
  if (prevP > WRAP_START_THRESHOLD && candP < WRAP_END_THRESHOLD) return 0;
  if (candP < prevP - 0.02) return 1.0;
  const maxJump = maxProgressJumpPerSecond * dtSec + 0.03;
  if (candP - prevP > maxJump) return 0.6 * (candP - prevP - maxJump);
  return 0;
}

export function greedySequenceAlign(
  frames: ProgressFrame[],
  candidateLists: ProgressCandidate[][],
  scanFps: number,
  maxProgressJumpPerSecond: number,
): ProgressCurvePoint[] {
  const selected: ProgressCurvePoint[] = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]!;
    const previous = selected[selected.length - 1];
    const previousCandidate: ProgressCandidate | undefined = previous
      ? { progress: previous.estimatedProgress, visualScore: previous.visualScore }
      : undefined;
    const dtSec =
      previous != null
        ? (frame.timestampMs - selected[selected.length - 1]!.timestampMs) / 1000
        : 1 / scanFps;
    const ranked = candidateLists[i]!
      .map((candidate) => ({
        ...candidate,
        sequenceScore:
          candidate.visualScore -
          sequencePenalty(previousCandidate, candidate, dtSec, maxProgressJumpPerSecond),
      }))
      .sort((a, b) => b.sequenceScore - a.sequenceScore);
    const best = ranked[0]!;
    selected.push({
      timestampMs: frame.timestampMs,
      timeSec: frame.timeSec,
      estimatedProgress: best.progress,
      confidence: best.sequenceScore,
      visualScore: best.visualScore,
    });
  }
  return selected;
}

function interpolateCrossingTime(
  prev: ProgressCurvePoint,
  row: ProgressCurvePoint,
  targetProgress: number,
): number {
  const dp = row.estimatedProgress - prev.estimatedProgress;
  if (Math.abs(dp) < 1e-6) return row.timeSec;
  const t = (targetProgress - prev.estimatedProgress) / dp;
  return prev.timeSec + t * (row.timeSec - prev.timeSec);
}

/** Lap number (1-based) for the last lap-start at or before playhead time. */
export function lapNumberAtTime(
  timeSeconds: number,
  lapStartTimes: number[],
): number | null {
  if (lapStartTimes.length === 0) return null;

  let lapNumber: number | null = null;
  for (let i = 0; i < lapStartTimes.length; i++) {
    if (lapStartTimes[i]! > timeSeconds + 0.001) break;
    lapNumber = i + 1;
  }
  return lapNumber;
}

function buildLapSegments(
  lapStartTimes: number[],
  scanEndSec: number,
): Array<{ lapNumber: number; startSec: number; endSec: number }> {
  return lapStartTimes.map((startSec, index) => ({
    lapNumber: index + 1,
    startSec,
    endSec: lapStartTimes[index + 1] ?? scanEndSec,
  }));
}

export function sliceMatchInputsByTime(
  frames: ProgressFrame[],
  candidateLists: ProgressCandidate[][],
  startSec: number,
  endSec: number,
): { frames: ProgressFrame[]; candidateLists: ProgressCandidate[][] } {
  const slicedFrames: ProgressFrame[] = [];
  const slicedCandidates: ProgressCandidate[][] = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]!;
    if (frame.timeSec < startSec - 0.001 || frame.timeSec > endSec + 0.001) continue;
    slicedFrames.push(frame);
    slicedCandidates.push(candidateLists[i]!);
  }
  return { frames: slicedFrames, candidateLists: slicedCandidates };
}

export function detectSplitCrossingProposalsPerLap(
  frames: ProgressFrame[],
  candidateLists: ProgressCandidate[][],
  splitProgress: Array<{ splitIndex: number; progress: number | null }>,
  splitConfidenceMin: number,
  lapStartTimes: number[],
  scanEndSec: number,
  scanFps: number,
  maxProgressJumpPerSecond: number,
): TrackMatchProposal[] {
  const targets = splitProgress
    .filter((s) => s.progress != null)
    .map((s) => ({ splitIndex: s.splitIndex, progress: s.progress! }))
    .sort((a, b) => a.progress - b.progress);
  if (targets.length === 0 || frames.length < 2 || lapStartTimes.length === 0) return [];

  const segments = buildLapSegments(lapStartTimes, scanEndSec);
  const proposals: TrackMatchProposal[] = [];

  for (const segment of segments) {
    const slice = sliceMatchInputsByTime(frames, candidateLists, segment.startSec, segment.endSec);
    if (slice.frames.length < 2) continue;

    const segmentCurve = greedySequenceAlign(
      slice.frames,
      slice.candidateLists,
      scanFps,
      maxProgressJumpPerSecond,
    );
    proposals.push(
      ...detectSplitCrossingsInSegment(
        segmentCurve,
        targets,
        splitConfidenceMin,
        segment.lapNumber,
      ),
    );
  }

  return proposals;
}

export function buildGeometricSplitProposals(
  lapStartTimes: number[],
  scanEndSec: number,
  targets: Array<{ splitIndex: number; progress: number }>,
): TrackMatchProposal[] {
  if (lapStartTimes.length === 0 || targets.length === 0) return [];

  const proposals: TrackMatchProposal[] = [];
  for (const segment of buildLapSegments(lapStartTimes, scanEndSec)) {
    const duration = segment.endSec - segment.startSec;
    if (duration <= 0.5) continue;

    for (const target of targets) {
      const timeSeconds = segment.startSec + target.progress * duration;
      proposals.push({
        id: `split-${segment.lapNumber}-${target.splitIndex}-${Math.round(timeSeconds * 1000)}`,
        kind: "split",
        timeSeconds,
        splitIndex: target.splitIndex,
        lapNumber: segment.lapNumber,
        confidence: 0.55,
      });
    }
  }

  return proposals;
}

function confidenceForProgressNearTime(
  timeSec: number,
  targetProgress: number,
  frames: ProgressFrame[],
  candidateLists: ProgressCandidate[][],
): number {
  if (frames.length === 0) return 0.55;

  let bestIdx = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < frames.length; i++) {
    const delta = Math.abs(frames[i]!.timeSec - timeSec);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  }

  const candidates = candidateLists[bestIdx] ?? [];
  if (candidates.length === 0) return 0.55;

  let bestScore = -1;
  for (const candidate of candidates) {
    const progressDelta = Math.abs(candidate.progress - targetProgress);
    const score = candidate.visualScore - progressDelta * 0.25;
    if (score > bestScore) bestScore = score;
  }

  return Math.max(0.52, Math.min(1, bestScore));
}

/** One split proposal per lap × split; visual crossing overrides timing when found. */
export function buildSplitProposalsForMarkedLaps(
  frames: ProgressFrame[],
  candidateLists: ProgressCandidate[][],
  splitProgress: Array<{ splitIndex: number; progress: number | null }>,
  splitConfidenceMin: number,
  lapStartTimes: number[],
  scanEndSec: number,
  scanFps: number,
  maxProgressJumpPerSecond: number,
): TrackMatchProposal[] {
  const targets = splitProgress
    .filter((s) => s.progress != null)
    .map((s) => ({ splitIndex: s.splitIndex, progress: s.progress! }))
    .sort((a, b) => a.progress - b.progress);
  if (targets.length === 0 || lapStartTimes.length === 0) return [];

  const visual = detectSplitCrossingProposalsPerLap(
    frames,
    candidateLists,
    splitProgress,
    splitConfidenceMin,
    lapStartTimes,
    scanEndSec,
    scanFps,
    maxProgressJumpPerSecond,
  );
  const geometric = buildGeometricSplitProposals(lapStartTimes, scanEndSec, targets);

  const visualByKey = new Map<string, TrackMatchProposal>();
  for (const proposal of visual) {
    visualByKey.set(`${proposal.lapNumber}-${proposal.splitIndex}`, proposal);
  }

  return geometric.map((proposal) => {
    const key = `${proposal.lapNumber}-${proposal.splitIndex}`;
    const matched = visualByKey.get(key);
    if (matched) return matched;

    const target = targets.find((t) => t.splitIndex === proposal.splitIndex);
    const confidence =
      target != null
        ? confidenceForProgressNearTime(
            proposal.timeSeconds,
            target.progress,
            frames,
            candidateLists,
          )
        : proposal.confidence;

    return { ...proposal, confidence };
  });
}

function detectSplitCrossingsInSegment(
  segmentCurve: ProgressCurvePoint[],
  targets: Array<{ splitIndex: number; progress: number }>,
  splitConfidenceMin: number,
  lapNumber: number,
): TrackMatchProposal[] {
  if (segmentCurve.length < 2) return [];

  const proposals: TrackMatchProposal[] = [];
  const crossedInLap = new Set<number>();
  const segmentStart = segmentCurve[0]!.timeSec;

  for (let i = 1; i < segmentCurve.length; i++) {
    const prev = segmentCurve[i - 1]!;
    const row = segmentCurve[i]!;

    for (const target of targets) {
      const p = target.progress;
      if (crossedInLap.has(target.splitIndex)) continue;

      const prevP = prev.estimatedProgress;
      const rowP = row.estimatedProgress;
      const crossed = (prevP <= p && rowP >= p) || (prevP >= p && rowP <= p);
      if (!crossed) continue;

      const timeSeconds = interpolateCrossingTime(prev, row, p);
      const confidence = Math.min(prev.confidence, row.confidence);
      if (confidence < splitConfidenceMin) continue;
      if (timeSeconds <= segmentStart + 0.05) continue;

      crossedInLap.add(target.splitIndex);
      proposals.push({
        id: `split-${lapNumber}-${target.splitIndex}-${Math.round(timeSeconds * 1000)}`,
        kind: "split",
        timeSeconds,
        splitIndex: target.splitIndex,
        lapNumber,
        confidence,
      });
    }
  }

  return proposals;
}

export function detectLapStartProposals(
  curve: ProgressCurvePoint[],
  minLapTimeMs: number,
  lapBoundaryConfidenceMin: number,
): TrackMatchProposal[] {
  const proposals: TrackMatchProposal[] = [];
  let lapNumber = 1;
  let lastLapStartSec = curve[0]?.timeSec ?? 0;

  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1]!;
    const row = curve[i]!;
    const isWrap =
      prev.estimatedProgress > WRAP_START_THRESHOLD &&
      row.estimatedProgress < WRAP_END_THRESHOLD;
    if (!isWrap) continue;

    const minGapSec = minLapTimeMs / 1000;
    if (row.timeSec - lastLapStartSec < minGapSec) continue;
    if (row.confidence < lapBoundaryConfidenceMin) continue;

    lapNumber += 1;
    proposals.push({
      id: `lapStart-${lapNumber}-${Math.round(row.timeSec * 1000)}`,
      kind: "lapStart",
      timeSeconds: row.timeSec,
      lapNumber,
      confidence: row.confidence,
    });
    lastLapStartSec = row.timeSec;
  }

  return proposals;
}

export function detectSplitCrossingProposals(
  curve: ProgressCurvePoint[],
  splitProgress: Array<{ splitIndex: number; progress: number | null }>,
  splitConfidenceMin: number,
  lapStartTimes?: number[],
): TrackMatchProposal[] {
  const targets = splitProgress
    .filter((s) => s.progress != null)
    .map((s) => ({ splitIndex: s.splitIndex, progress: s.progress! }))
    .sort((a, b) => a.progress - b.progress);
  if (targets.length === 0 || curve.length < 2) return [];

  if (lapStartTimes && lapStartTimes.length > 0) {
    // Legacy path: single global curve sliced by lap — kept for callers without per-lap inputs.
    const scanEndSec = curve[curve.length - 1]?.timeSec ?? lapStartTimes[lapStartTimes.length - 1]!;
    const segments = buildLapSegments(lapStartTimes, scanEndSec);
    const proposals: TrackMatchProposal[] = [];

    for (const segment of segments) {
      const segmentCurve = curve.filter(
        (point) => point.timeSec >= segment.startSec - 0.001 && point.timeSec <= segment.endSec + 0.001,
      );
      proposals.push(
        ...detectSplitCrossingsInSegment(
          segmentCurve,
          targets,
          splitConfidenceMin,
          segment.lapNumber,
        ),
      );
    }

    return proposals;
  }

  const proposals: TrackMatchProposal[] = [];
  let lapNumber = 1;
  let lastLapStartSec = curve[0]?.timeSec ?? 0;
  const crossedInLap = new Set<number>();

  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1]!;
    const row = curve[i]!;

    const isWrap =
      prev.estimatedProgress > WRAP_START_THRESHOLD &&
      row.estimatedProgress < WRAP_END_THRESHOLD;
    if (isWrap) {
      lapNumber += 1;
      lastLapStartSec = row.timeSec;
      crossedInLap.clear();
      continue;
    }

    for (const target of targets) {
      const p = target.progress;
      if (crossedInLap.has(target.splitIndex)) continue;

      const prevP = prev.estimatedProgress;
      const rowP = row.estimatedProgress;
      const crossed = (prevP <= p && rowP >= p) || (prevP >= p && rowP <= p);
      if (!crossed) continue;

      const timeSeconds = interpolateCrossingTime(prev, row, p);
      const confidence = Math.min(prev.confidence, row.confidence);
      if (confidence < splitConfidenceMin) continue;
      if (timeSeconds <= lastLapStartSec + 0.05) continue;

      crossedInLap.add(target.splitIndex);
      proposals.push({
        id: `split-${lapNumber}-${target.splitIndex}-${Math.round(timeSeconds * 1000)}`,
        kind: "split",
        timeSeconds,
        splitIndex: target.splitIndex,
        lapNumber,
        confidence,
      });
    }
  }

  return proposals;
}

export function detectLowConfidenceRanges(
  curve: ProgressCurvePoint[],
  splitConfidenceMin: number,
  minSegmentMs = 2000,
): LowConfidenceRange[] {
  if (curve.length === 0) return [];

  const ranges: LowConfidenceRange[] = [];
  let segStart = curve[0]!;
  let sum = segStart.confidence;
  let count = 1;

  for (let i = 1; i < curve.length; i++) {
    const row = curve[i]!;
    sum += row.confidence;
    count += 1;

    const durationMs = row.timestampMs - segStart.timestampMs;
    const next = curve[i + 1];
    const segmentEnded = !next || durationMs >= minSegmentMs;

    if (segmentEnded) {
      const avgConfidence = sum / count;
      if (avgConfidence < splitConfidenceMin) {
        ranges.push({
          startMs: segStart.timestampMs,
          endMs: row.timestampMs,
          avgConfidence,
        });
      }
      if (next) {
        segStart = next;
        sum = next.confidence;
        count = 1;
      }
    }
  }

  return ranges;
}
