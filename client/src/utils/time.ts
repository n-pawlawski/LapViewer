/** Format milliseconds as m:ss.mmm */
export function formatLapTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const secWhole = Math.floor(seconds);
  const millis = Math.round((seconds - secWhole) * 1000);
  return `${minutes}:${String(secWhole).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** Format seconds (comparison transport) as m:ss.s */
export function formatComparisonTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const secs = clamped % 60;
  const secWhole = Math.floor(secs);
  const tenths = Math.round((secs - secWhole) * 10);
  return `${minutes}:${String(secWhole).padStart(2, "0")}.${tenths}`;
}

/** Delta to best in seconds with sign, e.g. −0.423 or +1.201 */
export function formatDeltaToBest(lapTimeMs: number, bestMs: number): string {
  const deltaSec = (lapTimeMs - bestMs) / 1000;
  if (Math.abs(deltaSec) < 0.0005) return "—";
  const sign = deltaSec < 0 ? "−" : "+";
  return `${sign}${Math.abs(deltaSec).toFixed(3)}`;
}

export function formatVideoTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = Math.floor(clamped % 60);
  const millis = Math.round((clamped % 1) * 1000);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** Parse m:ss.mmm or m:ss or h:mm:ss into seconds */
export function parseVideoTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1].replace(",", "."));
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    return minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2].replace(",", "."));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return null;
    }
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

export function lapDurationSeconds(lap: { startSeconds: number; endSeconds: number }): number {
  return lap.endSeconds - lap.startSeconds;
}
