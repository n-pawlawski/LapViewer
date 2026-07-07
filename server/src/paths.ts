import path from "node:path";
import { VIDEO_LIBRARY_ROOT } from "./config.js";

/** Resolve a session's on-disk video path for the current runtime (native or Docker). */
export function resolveLocalVideoPath(input: {
  sourcePath: string;
  relativePath?: string | null;
  storageKind?: string | null;
}): string {
  if (input.storageKind === "s3") {
    return input.sourcePath;
  }
  const relative = input.relativePath?.trim();
  if (relative) {
    return path.normalize(path.join(VIDEO_LIBRARY_ROOT, relative));
  }
  return path.normalize(input.sourcePath);
}
