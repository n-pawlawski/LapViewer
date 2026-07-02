import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

/** Hardcoded demo clip for the video playback spike. */
export const DEMO_VIDEO_PATH = path.join(
  "E:",
  "Racing Videos",
  "2-19 racing league",
  "GX010012.MP4",
);

export const PORT = Number(process.env.PORT) || 3000;

export const DATA_DIR =
  process.env.DATA_DIR ?? path.join(projectRoot, "data");

export const VIDEO_LIBRARY_ROOT =
  process.env.VIDEO_LIBRARY_ROOT ?? path.join("E:", "Racing Videos");
