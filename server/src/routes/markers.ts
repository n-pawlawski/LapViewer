import { Router } from "express";
import { getDb } from "../db/database.js";
import {
  deleteMarker,
  getSessionById,
  updateMarker,
} from "../services/sessions.js";
import type { UpdateMarkerBody } from "../types.js";
import {
  scheduleSplitBankRemove,
  scheduleSplitBankUpsert,
} from "../services/splitBankSync.js";

export const markersRouter = Router();

markersRouter.patch("/:id", (req, res) => {
  const body = req.body as UpdateMarkerBody;
  try {
    const marker = updateMarker(req.params.id, body, req.userId!);
    const session = getSessionById(marker.sessionId, req.userId!);
    if (marker.kind === "split" && body.timeSeconds !== undefined) {
      scheduleSplitBankUpsert(marker.id, req.userId!);
    }
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
    .prepare(`SELECT sessionId, kind FROM markers WHERE id = ?`)
    .get(req.params.id) as { sessionId: string; kind: string } | undefined;

  if (!row) {
    res.status(404).json({ error: "Marker not found" });
    return;
  }

  const deleted = deleteMarker(req.params.id, req.userId!);
  if (!deleted) {
    res.status(404).json({ error: "Marker not found" });
    return;
  }
  if (row.kind === "split") {
    scheduleSplitBankRemove(req.params.id);
  }
  const session = getSessionById(row.sessionId, req.userId!);
  res.json({ session });
});
