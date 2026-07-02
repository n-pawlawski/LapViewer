const LAP_ID_SUFFIX = "-lap-";

/** Parse `${sessionId}-lap-${n}` — session IDs may contain hyphens (UUIDs). */
export function parseLapId(lapId: string): { sessionId: string; lapNumber: number } | null {
  const idx = lapId.lastIndexOf(LAP_ID_SUFFIX);
  if (idx <= 0) return null;

  const lapNumber = Number(lapId.slice(idx + LAP_ID_SUFFIX.length));
  if (!Number.isInteger(lapNumber) || lapNumber < 1) return null;

  return { sessionId: lapId.slice(0, idx), lapNumber };
}
