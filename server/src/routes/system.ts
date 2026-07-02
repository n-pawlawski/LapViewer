import { Router } from "express";
import { VIDEO_LIBRARY_ROOT } from "../config.js";
import { pickFolder, pickVideoFile } from "../services/fileDialog.js";
import { getTrackById } from "../services/tracks.js";

export const systemRouter = Router();

function resolveInitialDir(body: { initialDir?: string; trackId?: string }): string {
  if (body.trackId) {
    const track = getTrackById(body.trackId);
    if (track?.videoFolder) {
      return track.videoFolder;
    }
  }

  return body.initialDir || VIDEO_LIBRARY_ROOT;
}

systemRouter.post("/pick-video-file", (req, res) => {
  const body = req.body as { initialDir?: string; trackId?: string };
  const initialDir = resolveInitialDir(body);

  try {
    const path = pickVideoFile(initialDir);
    res.json({ path });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "UNSUPPORTED_PLATFORM") {
      res.status(501).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || "File picker failed" });
  }
});

systemRouter.post("/pick-folder", (req, res) => {
  const body = req.body as { initialDir?: string; trackId?: string };
  const initialDir = resolveInitialDir(body);

  try {
    const path = pickFolder(initialDir);
    res.json({ path });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "UNSUPPORTED_PLATFORM") {
      res.status(501).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || "Folder picker failed" });
  }
});
