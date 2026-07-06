import { Router } from "express";
import {
  createTrack,
  deleteTrack,
  getTrackById,
  listTracks,
  updateTrack,
} from "../services/tracks.js";
import { replaceTrackSplits } from "../services/trackSplits.js";
import type { CreateTrackBody, ReplaceTrackSplitsBody, UpdateTrackBody } from "../types.js";

export const tracksRouter = Router();

tracksRouter.get("/", (req, res) => {
  res.json(listTracks(req.userId!));
});

tracksRouter.get("/:id", (req, res) => {
  const track = getTrackById(req.params.id, req.userId!);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }
  res.json(track);
});

tracksRouter.post("/", (req, res) => {
  const body = req.body as CreateTrackBody;
  try {
    const track = createTrack(body, req.userId!);
    res.status(201).json(track);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === "DUPLICATE_NAME") {
      res.status(409).json({ error: error.message });
      return;
    }
    throw err;
  }
});

tracksRouter.patch("/:id", (req, res) => {
  const body = req.body as UpdateTrackBody;
  try {
    const track = updateTrack(req.params.id, body, req.userId!);
    res.json(track);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === "DUPLICATE_NAME") {
      res.status(409).json({ error: error.message });
      return;
    }
    throw err;
  }
});

tracksRouter.delete("/:id", (req, res) => {
  try {
    deleteTrack(req.params.id, req.userId!);
    res.status(204).send();
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ error: error.message });
      return;
    }
    throw err;
  }
});

tracksRouter.put("/:id/splits", (req, res) => {
  const body = req.body as ReplaceTrackSplitsBody;
  if (!Array.isArray(body?.splits)) {
    res.status(400).json({ error: "splits array is required" });
    return;
  }
  try {
    const splits = replaceTrackSplits(req.params.id, body.splits);
    const track = getTrackById(req.params.id, req.userId!);
    res.json({ splits, track });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    throw err;
  }
});
