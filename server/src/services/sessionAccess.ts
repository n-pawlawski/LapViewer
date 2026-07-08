import { getDb } from "../db/database.js";
import type { SessionRow } from "../types.js";

export type SessionAccess =
  | { mode: "owner"; row: SessionRow }
  | { mode: "public"; row: SessionRow; ownerDisplayName: string };

export function rowIsPublic(row: SessionRow): boolean {
  return row.isPublic === 1;
}

export function isPublicShareable(row: SessionRow): boolean {
  return (
    rowIsPublic(row) &&
    row.storageKind === "s3" &&
    row.uploadStatus === "complete"
  );
}

export function getSessionRowById(id: string): SessionRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(id) as SessionRow | undefined;
  return row ?? null;
}

export function resolveSessionAccess(
  sessionId: string,
  viewerUserId: string,
): SessionAccess | null {
  const row = getSessionRowById(sessionId);
  if (!row) return null;

  if (row.userId === viewerUserId) {
    return { mode: "owner", row };
  }

  if (!isPublicShareable(row)) return null;

  const user = getDb()
    .prepare(`SELECT displayName FROM users WHERE id = ?`)
    .get(row.userId) as { displayName: string } | undefined;

  return {
    mode: "public",
    row,
    ownerDisplayName: user?.displayName ?? "Unknown",
  };
}
