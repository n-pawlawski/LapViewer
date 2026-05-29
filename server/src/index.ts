import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_VIDEO_PATH, PORT } from "./config.js";
import { streamVideoFile } from "./video.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");

const app = express();
app.use(cors());

app.get("/api/health", (_req, res) => {
  const exists = fs.existsSync(DEMO_VIDEO_PATH);
  res.json({
    ok: true,
    demoVideo: DEMO_VIDEO_PATH,
    demoVideoExists: exists,
  });
});

app.get("/api/video/demo", (req, res) => {
  streamVideoFile(DEMO_VIDEO_PATH, req, res);
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`LapViewer API http://localhost:${PORT}`);
  console.log(`Demo video: ${DEMO_VIDEO_PATH}`);
  console.log(`File exists: ${fs.existsSync(DEMO_VIDEO_PATH)}`);
});
