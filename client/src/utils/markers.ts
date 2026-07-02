export const MARKER_SNAP_SECONDS = 0.5;

export function nearestWithinThreshold<T extends { id: string; timeSeconds: number }>(
  items: T[],
  timeSeconds: number,
  thresholdSeconds: number,
): T | undefined {
  let best: T | undefined;
  let bestDist = thresholdSeconds;

  for (const item of items) {
    const dist = Math.abs(item.timeSeconds - timeSeconds);
    if (dist <= thresholdSeconds && dist < bestDist) {
      best = item;
      bestDist = dist;
    }
  }

  return best;
}
