import type { Marker } from "../types";

/**
 * Shift+arrow jump: seek to the nearer of (start/end) or (prev/next marker).
 */
export function seekJumpTarget(
  direction: "left" | "right",
  currentTime: number,
  markers: Pick<Marker, "timeSeconds">[],
  durationSeconds: number,
): number {
  const epsilon = 0.001;

  if (direction === "left") {
    const candidates = [0];
    for (const marker of markers) {
      if (marker.timeSeconds < currentTime - epsilon) {
        candidates.push(marker.timeSeconds);
      }
    }
    return pickNearest(currentTime, candidates);
  }

  const candidates: number[] = [];
  if (durationSeconds > 0) {
    candidates.push(durationSeconds);
  }
  for (const marker of markers) {
    if (marker.timeSeconds > currentTime + epsilon) {
      candidates.push(marker.timeSeconds);
    }
  }

  if (candidates.length === 0) {
    return currentTime;
  }
  return pickNearest(currentTime, candidates);
}

function pickNearest(currentTime: number, candidates: number[]): number {
  let best = candidates[0];
  let bestDist = Math.abs(best - currentTime);
  for (let i = 1; i < candidates.length; i++) {
    const dist = Math.abs(candidates[i] - currentTime);
    if (dist < bestDist) {
      best = candidates[i];
      bestDist = dist;
    }
  }
  return best;
}
