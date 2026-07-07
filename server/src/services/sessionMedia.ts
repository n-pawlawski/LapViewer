import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../config.js";
import { downloadObjectToFile } from "./objectStorage.js";
import { getSessionVideoTarget } from "./sessions.js";

export type SessionMediaInput = { kind: "file"; path: string } | { kind: "url"; url: string };

function sessionMaterializedPath(sessionId: string): string {
  return path.join(DATA_DIR, "cache", sessionId, "original.mp4");
}

/** Local filesystem path or presigned URL suitable for ffmpeg input. */
export async function resolveSessionMediaInput(
  sessionId: string,
  userId: string,
): Promise<SessionMediaInput | null> {
  const target = getSessionVideoTarget(sessionId, userId);
  if (!target) return null;

  if (target.kind === "local_path") {
    if (!fs.existsSync(target.path)) return null;
    return { kind: "file", path: target.path };
  }

  const cachePath = sessionMaterializedPath(sessionId);
  if (fs.existsSync(cachePath)) {
    return { kind: "file", path: cachePath };
  }

  await downloadObjectToFile(target.objectKey, cachePath);
  return { kind: "file", path: cachePath };
}

/** ffmpeg and other tools that require a local path. */
export async function resolveSessionMediaPath(
  sessionId: string,
  userId: string,
): Promise<string | null> {
  const media = await resolveSessionMediaInput(sessionId, userId);
  if (!media || media.kind !== "file") return null;
  return media.path;
}
