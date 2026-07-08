import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLIENT_ORIGIN,
  DATA_DIR,
  DEMO_VIDEO_PATH,
  PORT,
  FFMPEG_PATH,
  deployEnv,
  ffmpegAvailable,
  isDevUserMode,
} from "./config.js";
import { initDatabase } from "./db/database.js";
import { seedDevUserIfNeeded } from "./db/devSeed.js";
import { seedIfEmpty } from "./db/seed.js";
import { requireAuth } from "./middleware/auth.js";
import { errorLoggingMiddleware, logger, requestLoggingMiddleware } from "./logger.js";
import { authRouter } from "./routes/auth.js";
import { accountRouter } from "./routes/account.js";
import { usersRouter } from "./routes/users.js";
import { markersRouter } from "./routes/markers.js";
import { detectionRouter, sessionDetectionRouter, trackDetectionRouter } from "./routes/detection.js";
import { healthRouter } from "./routes/ops.js";
import { sessionsRouter, videoRouter, lapsRouter } from "./routes/sessions.js";
import { uploadRouter } from "./routes/upload.js";
import { systemRouter } from "./routes/system.js";
import { tracksRouter } from "./routes/tracks.js";
import { trackReferenceRouter } from "./routes/referenceProfile.js";
import {
  referenceBuildRouter,
  sessionTrackMatchRouter,
  trackMatchRouter,
} from "./routes/trackMatch.js";
import {
  sessionSplitDetectionRouter,
  splitDetectionRouter,
  trackSplitBankRouter,
} from "./routes/splitDetection.js";
import { streamVideoFile } from "./video.js";
import { GIT_SHA } from "./buildInfo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");

await initDatabase();
const devUserId = seedDevUserIfNeeded();
if (devUserId) {
  seedIfEmpty(devUserId);
}

const app = express();
app.use(requestLoggingMiddleware);
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use("/api", healthRouter);

app.get("/api/video/demo", (req, res) => {
  streamVideoFile(DEMO_VIDEO_PATH, req, res);
});

app.use("/api/auth", authRouter);
app.use("/api/account", requireAuth, accountRouter);
app.use("/api/users", requireAuth, usersRouter);

app.use("/api/sessions", requireAuth, sessionsRouter);
app.use("/api/sessions", requireAuth, uploadRouter);
app.use("/api/laps", requireAuth, lapsRouter);
app.use("/api/sessions", requireAuth, sessionDetectionRouter);
app.use("/api/markers", requireAuth, markersRouter);
app.use("/api/tracks", requireAuth, tracksRouter);
app.use("/api/tracks", requireAuth, trackReferenceRouter);
app.use("/api/reference-build", requireAuth, referenceBuildRouter);
app.use("/api/sessions", requireAuth, sessionTrackMatchRouter);
app.use("/api/match-track", requireAuth, trackMatchRouter);
app.use("/api/tracks", requireAuth, trackDetectionRouter);
app.use("/api/detect-laps", requireAuth, detectionRouter);
app.use("/api/tracks", requireAuth, trackSplitBankRouter);
app.use("/api/sessions", requireAuth, sessionSplitDetectionRouter);
app.use("/api/detect-splits", requireAuth, splitDetectionRouter);
app.use("/api/system", requireAuth, systemRouter);
app.use("/api/video", requireAuth, videoRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorLoggingMiddleware);

app.listen(PORT, () => {
  logger.info("server_started", {
    port: PORT,
    gitSha: GIT_SHA,
    deployEnv: deployEnv(),
    dataDir: DATA_DIR,
    ffmpegPath: FFMPEG_PATH,
    ffmpegAvailable: ffmpegAvailable(),
    devUserMode: isDevUserMode(),
    demoVideoExists: fs.existsSync(DEMO_VIDEO_PATH),
  });
});
