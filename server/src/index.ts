import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATA_DIR,
  DEMO_VIDEO_PATH,
  PORT,
  FFMPEG_PATH,
  ffmpegAvailable,
  isDevUserMode,
} from "./config.js";
import { initDatabase } from "./db/database.js";
import { seedDevUserIfNeeded } from "./db/devSeed.js";
import { seedIfEmpty } from "./db/seed.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { markersRouter } from "./routes/markers.js";
import { detectionRouter, sessionDetectionRouter, trackDetectionRouter } from "./routes/detection.js";
import { sessionsRouter, videoRouter } from "./routes/sessions.js";
import { systemRouter } from "./routes/system.js";
import { tracksRouter } from "./routes/tracks.js";
import { streamVideoFile } from "./video.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");

initDatabase();
const devUserId = seedDevUserIfNeeded();
if (devUserId) {
  seedIfEmpty(devUserId);
}

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const exists = fs.existsSync(DEMO_VIDEO_PATH);
  res.json({
    ok: true,
    dataDir: DATA_DIR,
    demoVideo: DEMO_VIDEO_PATH,
    demoVideoExists: exists,
    ffmpegPath: FFMPEG_PATH,
    ffmpegAvailable: ffmpegAvailable(),
    devUserMode: isDevUserMode(),
  });
});

app.get("/api/video/demo", (req, res) => {
  streamVideoFile(DEMO_VIDEO_PATH, req, res);
});

app.use("/api/auth", authRouter);

app.use("/api/sessions", requireAuth, sessionsRouter);
app.use("/api/sessions", requireAuth, sessionDetectionRouter);
app.use("/api/markers", requireAuth, markersRouter);
app.use("/api/tracks", requireAuth, tracksRouter);
app.use("/api/tracks", requireAuth, trackDetectionRouter);
app.use("/api/detect-laps", requireAuth, detectionRouter);
app.use("/api/system", requireAuth, systemRouter);
app.use("/api/video", requireAuth, videoRouter);

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`LapViewer API http://localhost:${PORT}`);
  console.log(`DATA_DIR: ${DATA_DIR}`);
  console.log(`Demo video: ${DEMO_VIDEO_PATH}`);
  console.log(`File exists: ${fs.existsSync(DEMO_VIDEO_PATH)}`);
  console.log(`Dev user mode: ${isDevUserMode()}`);
});
