import path from "node:path";
import { fileURLToPath } from "node:url";
import { FFMPEG_PATH, ffmpegAvailable } from "./ffmpegPath.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

export const PORT = Number(process.env.PORT) || 3000;

export const DATA_DIR =
  process.env.DATA_DIR ?? path.join(projectRoot, "data");

export const VIDEO_LIBRARY_ROOT =
  process.env.VIDEO_LIBRARY_ROOT ?? path.join("E:", "Racing Videos");

/** Demo clip for spike / seed; override in Docker via env. */
export const DEMO_VIDEO_PATH = process.env.DEMO_VIDEO_PATH
  ? path.normalize(process.env.DEMO_VIDEO_PATH)
  : path.join(VIDEO_LIBRARY_ROOT, "2-19 racing league", "GX010012.MP4");

export type StorageBackend = "local_path" | "s3";

export function storageBackend(): StorageBackend {
  return process.env.STORAGE_BACKEND === "s3" ? "s3" : "local_path";
}

export const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
export const S3_BUCKET = process.env.S3_BUCKET ?? "";

/** S3 API endpoint (MinIO locally). Omit for AWS default. */
export const AWS_ENDPOINT_URL = process.env.AWS_ENDPOINT_URL ?? "";

/** Browser-reachable endpoint for presigned PUT URLs. Defaults to AWS_ENDPOINT_URL. */
export const S3_PUBLIC_ENDPOINT = process.env.S3_PUBLIC_ENDPOINT ?? AWS_ENDPOINT_URL;

export const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true";

export const DATABASE_URL = process.env.DATABASE_URL ?? "";

export type DeployEnv = "production" | "staging" | "development" | "local-docker";

export function deployEnv(): DeployEnv {
  const value = process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? "development";
  if (value === "production" || value === "staging" || value === "local-docker") {
    return value;
  }
  return "development";
}

export function isProductionDeploy(): boolean {
  return deployEnv() === "production";
}

/** True when dev user seed (root/root) is allowed. */
export function isDevUserMode(): boolean {
  if (isProductionDeploy()) return false;
  return (
    process.env.NODE_ENV === "development" || process.env.LAPVIEWER_DEV_USER === "1"
  );
}

/** HMAC secret for signed session cookies. Dev fallback only — set in production. */
export const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "lapviewer-dev-session-secret-change-me";

export { FFMPEG_PATH, ffmpegAvailable };

/** Downscaled frame size for lap detection scans. */
export const DETECTION_FRAME_WIDTH = 320;
export const DETECTION_FRAME_HEIGHT = 180;
