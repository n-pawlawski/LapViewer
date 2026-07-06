/**
 * Pure lap-detection helpers (no ffmpeg/sharp) — exported for unit tests.
 */

export interface TimelinePoint {
  time: number;
  score: number;
}

export interface DetectionProposal {
  time: number;
  score: number;
  confidence: number;
}

export interface PeriodicWalkInput {
  times: number[];
  rois: Uint8Array[];
  bankTemplates: Uint8Array[];
  anchorTime: number;
  lapTimeSec: number;
  searchWindowSec: number;
  proximityWeight: number;
  endTime: number;
  /** Stop detecting when the next expected start would exceed this time. */
  finalMarkerTime?: number;
  /** Minimum NCC score to accept a detection; below this ends the walk. */
  minConfidence?: number;
  /** When true, expected times are anchor + k·lapTime instead of cumulative resync. */
  fixedSchedule?: boolean;
}

const DEFAULT_MIN_CONFIDENCE = 0.25;

/** Normalized cross-correlation of two equal-length grayscale vectors. */
export function ncc(a: Uint8Array | Buffer, b: Uint8Array | Buffer): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let sA = 0;
  let sB = 0;
  let sAB = 0;
  let sA2 = 0;
  let sB2 = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    sA += ai;
    sB += bi;
    sAB += ai * bi;
    sA2 += ai * ai;
    sB2 += bi * bi;
  }
  const num = n * sAB - sA * sB;
  const den = Math.sqrt((n * sA2 - sA * sA) * (n * sB2 - sB * sB));
  return den === 0 ? 0 : num / den;
}

/** Best NCC score of `roi` against any template in the bank. */
export function bestBankScore(roi: Uint8Array, bankTemplates: Uint8Array[]): number {
  if (bankTemplates.length === 0) return -1;
  let best = -Infinity;
  for (const template of bankTemplates) {
    const score = ncc(template, roi);
    if (score > best) best = score;
  }
  return best;
}

/** Dominant period (seconds) via autocorrelation of a score series. */
export function estimatePeriod(
  scores: number[],
  fps: number,
  minPeriodSec = 15,
  maxPeriodSec = 60,
): number {
  if (scores.length < 2 || fps <= 0) return minPeriodSec;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const centered = scores.map((v) => v - mean);
  let bestLag = -1;
  let bestVal = -Infinity;
  const minLag = Math.round(minPeriodSec * fps);
  const maxLag = Math.min(Math.round(maxPeriodSec * fps), centered.length - 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < centered.length; i++) {
      sum += centered[i]! * centered[i + lag]!;
    }
    if (sum > bestVal) {
      bestVal = sum;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? bestLag / fps : minPeriodSec;
}

export function indexNearestTime(times: number[], t: number): number {
  let bestIndex = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < times.length; i++) {
    const delta = Math.abs(times[i]! - t);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Snap anchor to the strongest bank match within ±windowSec. */
export function refineAnchor(
  times: number[],
  scores: number[],
  anchorTime: number,
  windowSec = 0.6,
): { time: number; score: number } {
  let best: { time: number; score: number } | null = null;
  for (let i = 0; i < times.length; i++) {
    const t = times[i]!;
    if (Math.abs(t - anchorTime) > windowSec) continue;
    const score = scores[i]!;
    if (!best || score > best.score) best = { time: t, score };
  }
  return best ?? { time: anchorTime, score: 0 };
}

/**
 * Walk forward from anchor using bank template matching with proximity weighting.
 * Re-scores each candidate frame against the bank inside the search window.
 */
export function periodicWalk(input: PeriodicWalkInput): DetectionProposal[] {
  const {
    times,
    rois,
    bankTemplates,
    anchorTime,
    lapTimeSec,
    searchWindowSec,
    proximityWeight,
    endTime,
    finalMarkerTime,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    fixedSchedule = false,
  } = input;

  if (times.length === 0 || bankTemplates.length === 0) return [];

  const anchorSnap = refineAnchor(
    times,
    times.map((_, i) => bestBankScore(rois[i]!, bankTemplates)),
    anchorTime,
  );
  const anchorScore = anchorSnap.score;
  const anchorResolved = anchorSnap.time;

  const out: DetectionProposal[] = [
    { time: anchorResolved, score: anchorScore, confidence: anchorScore },
  ];
  let cur = anchorResolved;
  let k = 0;

  while (cur + lapTimeSec - searchWindowSec <= endTime) {
    k++;
    const expected = fixedSchedule ? anchorResolved + k * lapTimeSec : cur + lapTimeSec;
    if (finalMarkerTime != null && expected - searchWindowSec > finalMarkerTime) break;

    let best: { time: number; score: number; adj: number } | null = null;
    for (let i = 0; i < times.length; i++) {
      const t = times[i]!;
      if (t < expected - searchWindowSec || t > expected + searchWindowSec) continue;
      const score = bestBankScore(rois[i]!, bankTemplates);
      const adj = score - proximityWeight * Math.abs(t - expected);
      if (!best || adj > best.adj) best = { time: t, score, adj };
    }

    if (!best || best.score < minConfidence) break;
    if (finalMarkerTime != null && best.time > finalMarkerTime) break;

    out.push({ time: best.time, score: best.score, confidence: best.score });
    cur = best.time;
  }

  return out;
}
