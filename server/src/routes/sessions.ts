import { Router } from "express";
import { requireUserPermission } from "../middleware/requirePermission.js";
import {
  deleteSession,
  getSessionById,
  getSessionVideoTarget,
  insertMarker,
  listAllLaps,
  listPublicLaps,
  listPublicSessions,
  listSessions,
  maybeFinalizePendingUpload,
  maybeFinalizePendingUploadsForUser,
  updateSession,
} from "../services/sessions.js";
import type { CreateMarkerBody, UpdateSessionBody } from "../types.js";
import { streamStoredObject, createPlaybackPresignedUrl } from "../services/objectStorage.js";
import { streamVideoFile } from "../video.js";
import { scheduleSplitBankUpsert } from "../services/splitBankSync.js";

export const sessionsRouter = Router();

sessionsRouter.get("/", async (req, res) => {
  await maybeFinalizePendingUploadsForUser(req.userId!);
  res.json(listSessions(req.userId!));
});

sessionsRouter.get("/public", (req, res) => {
  res.json(listPublicSessions(req.userId!));
});

sessionsRouter.get("/:id/markers", (req, res) => {
  const session = getSessionById(req.params.id, req.userId!);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session.markers);
});

sessionsRouter.post("/:id/markers", (req, res) => {
  const body = req.body as CreateMarkerBody;
  if (body?.timeSeconds == null || typeof body.timeSeconds !== "number") {
    res.status(400).json({ error: "timeSeconds is required" });
    return;
  }

  try {
    const marker = insertMarker(req.params.id, body.timeSeconds, {
      label: body.label,
      kind: body.kind,
      lapNumber: body.lapNumber,
      splitIndex: body.splitIndex,
    }, req.userId!);
    const session = getSessionById(req.params.id, req.userId!);
    if (marker.kind === "split") {
      scheduleSplitBankUpsert(marker.id, req.userId!);
    }
    res.status(201).json({ marker, session });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ error: error.message });
      return;
    }
    throw err;
  }
});

sessionsRouter.get("/:id", async (req, res) => {
  await maybeFinalizePendingUpload(req.params.id, req.userId!);
  const session = getSessionById(req.params.id, req.userId!);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

sessionsRouter.post("/", (_req, res) => {
  res.status(410).json({
    error: "Path registration is deprecated. Upload a video file via POST /api/sessions/upload instead.",
  });
});

sessionsRouter.patch("/:id", (req, res) => {
  const body = req.body as UpdateSessionBody;
  try {
    const session = updateSession(req.params.id, body, req.userId!);
    res.json(session);
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

sessionsRouter.delete("/:id", requireUserPermission("sessions.delete"), (req, res) => {
  const deleted = deleteSession(req.params.id, req.userId!);
  if (!deleted) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.status(204).send();
});

export const lapsRouter = Router();

lapsRouter.get("/", (req, res) => {
  res.json(listAllLaps(req.userId!));
});

lapsRouter.get("/public", (req, res) => {
  res.json(listPublicLaps(req.userId!));
});

export const videoRouter = Router();

videoRouter.get("/:sessionId/playback-url", async (req, res) => {
  const target = getSessionVideoTarget(req.params.sessionId, req.userId!);
  if (!target) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (target.kind === "s3") {
    try {
      const url = await createPlaybackPresignedUrl({ objectKey: target.objectKey });
      res.json({ url, mode: "presigned" as const });
      return;
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Could not create playback URL",
      });
      return;
    }
  }
  res.json({ url: `/api/video/${req.params.sessionId}`, mode: "proxy" as const });
});

videoRouter.get("/:sessionId", (req, res) => {
  const target = getSessionVideoTarget(req.params.sessionId, req.userId!);
  if (!target) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (target.kind === "s3") {
    void streamStoredObject(target.objectKey, req, res);
    return;
  }
  streamVideoFile(target.path, req, res);
});
