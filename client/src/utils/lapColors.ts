const STORAGE_KEY = "lapviewer-lap-colors";

/** Color per lap slot (index 0 = first selected lap). Supports up to 4 laps. */
export const DEFAULT_LAP_COLORS: [string, string, string, string] = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // violet
  "#ec4899", // pink
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function loadLapColors(): [string, string, string, string] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_LAP_COLORS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_LAP_COLORS];
    return DEFAULT_LAP_COLORS.map((fallback, i) => {
      const value = parsed[i];
      return typeof value === "string" && HEX_RE.test(value) ? value : fallback;
    }) as [string, string, string, string];
  } catch {
    return [...DEFAULT_LAP_COLORS];
  }
}

export function saveLapColors(colors: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors.slice(0, 4)));
  } catch {
    // ignore persistence failures (private mode, etc.)
  }
}
