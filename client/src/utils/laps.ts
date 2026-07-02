/**
 * Lap time from this marker's start to the next marker, or to video end for the last marker.
 */
export function lapTimeMsAtMarker(
  markers: { timeSeconds: number; ignored?: boolean }[],
  index: number,
  durationSeconds: number | null,
): number | null {
  if (markers[index]?.ignored) return null;
  const current = markers[index];
  const next = markers[index + 1];

  if (next) {
    return Math.round((next.timeSeconds - current.timeSeconds) * 1000);
  }

  if (durationSeconds != null && durationSeconds > current.timeSeconds) {
    return Math.round((durationSeconds - current.timeSeconds) * 1000);
  }

  return null;
}

export function bestLapTimeMsFromMarkers(
  markers: { timeSeconds: number; ignored?: boolean }[],
  durationSeconds: number | null,
): number | undefined {
  const times: number[] = [];
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].ignored) continue;
    const ms = lapTimeMsAtMarker(markers, i, durationSeconds);
    if (ms != null) times.push(ms);
  }
  if (times.length === 0) return undefined;
  return Math.min(...times);
}
