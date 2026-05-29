import path from "node:path";

/** Hardcoded demo clip for the video playback spike. */
export const DEMO_VIDEO_PATH = path.join(
  "E:",
  "Racing Videos",
  "2-19 racing league",
  "GX010012.MP4",
);

export const PORT = Number(process.env.PORT) || 3000;
