import { Router } from "express";
import { getDb } from "../db/database.js";
import {
  deleteMarker,
  getSessionById,
  updateMarker,
} from "../services/sessions.js";
import type { UpdateMarkerBody } from "../types.js";

export const markersRouter = Router();

markersRouter.patch("/:id", (req, res) => {
  const body = req.body as UpdateMarkerBody;
  try {
    const marker = updateMarker(req.params.id, body);
    const session = getSessionById(marker.sessionId);
    res.json({ marker, session });
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

markersRouter.delete("/:id", (req, res) => {
  const row = getDb()
    .prepare(`SELECT sessionId FROM markers WHERE id = ?`)
    .get(req.params.id) as { sessionId: string } | undefined;

  if (!row) {
    res.status(404).json({ error: "Marker not found" });
    return;
  }

  deleteMarker(req.params.id);
  const session = getSessionById(row.sessionId);
  res.json({ session });
});
