import { Router } from "express";
import {
  createSession,
  getSessionById,
  getSessionSourcePath,
  insertMarker,
  listSessions,
  updateSession,
} from "../services/sessions.js";
import type { CreateMarkerBody, CreateSessionBody, UpdateSessionBody } from "../types.js";
import { streamVideoFile } from "../video.js";

export const sessionsRouter = Router();

sessionsRouter.get("/", (req, res) => {
  res.json(listSessions(req.userId!));
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

sessionsRouter.get("/:id", (req, res) => {
  const session = getSessionById(req.params.id, req.userId!);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

sessionsRouter.post("/", (req, res) => {
  const body = req.body as CreateSessionBody;
  if (!body?.sourcePath || typeof body.sourcePath !== "string") {
    res.status(400).json({ error: "sourcePath is required" });
    return;
  }

  try {
    const session = createSession(body, req.userId!);
    res.status(201).json(session);
  } catch (err) {
    const error = err as Error & { code?: string; sessionId?: string };
    if (error.code === "DUPLICATE_PATH") {
      res.status(409).json({
        error: error.message,
        sessionId: error.sessionId,
      });
      return;
    }
    throw err;
  }
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
    throw err;
  }
});

export const videoRouter = Router();

videoRouter.get("/:sessionId", (req, res) => {
  const sourcePath = getSessionSourcePath(req.params.sessionId, req.userId!);
  if (!sourcePath) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  streamVideoFile(sourcePath, req, res);
});
