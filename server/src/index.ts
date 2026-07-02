import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_DIR, DEMO_VIDEO_PATH, PORT } from "./config.js";
import { initDatabase } from "./db/database.js";
import { seedIfEmpty } from "./db/seed.js";
import { markersRouter } from "./routes/markers.js";
import { sessionsRouter, videoRouter } from "./routes/sessions.js";
import { systemRouter } from "./routes/system.js";
import { tracksRouter } from "./routes/tracks.js";
import { streamVideoFile } from "./video.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");

initDatabase();
seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const exists = fs.existsSync(DEMO_VIDEO_PATH);
  res.json({
    ok: true,
    dataDir: DATA_DIR,
    demoVideo: DEMO_VIDEO_PATH,
    demoVideoExists: exists,
  });
});

app.get("/api/video/demo", (req, res) => {
  streamVideoFile(DEMO_VIDEO_PATH, req, res);
});

app.use("/api/sessions", sessionsRouter);
app.use("/api/markers", markersRouter);
app.use("/api/tracks", tracksRouter);
app.use("/api/system", systemRouter);
app.use("/api/video", videoRouter);

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
});
