import { Router } from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  completeS3UploadSession,
  createS3UploadSession,
} from "../services/sessions.js";
import { createUploadPresignedUrl, isS3StorageEnabled } from "../services/objectStorage.js";

export const uploadRouter = Router();

uploadRouter.post("/upload-url", async (req, res) => {
  if (!isS3StorageEnabled()) {
    res.status(503).json({ error: "S3 upload is not enabled on this server" });
    return;
  }

  const body = req.body as {
    fileName?: string;
    title?: string;
    trackName?: string | null;
    recordedAt?: string | null;
    notes?: string | null;
    contentType?: string;
  };

  if (!body?.fileName || typeof body.fileName !== "string") {
    res.status(400).json({ error: "fileName is required" });
    return;
  }

  const sessionId = randomUUID();
  const fileName = path.basename(body.fileName);

  try {
    const session = createS3UploadSession(
      {
        sessionId,
        fileName,
        title: body.title,
        trackName: body.trackName,
        recordedAt: body.recordedAt,
        notes: body.notes,
      },
      req.userId!,
    );

    const { uploadUrl } = await createUploadPresignedUrl({
      objectKey: session.objectKey!,
      contentType: body.contentType,
    });

    res.status(201).json({
      sessionId: session.id,
      uploadUrl,
      objectKey: session.objectKey,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Could not create upload session",
    });
  }
});

uploadRouter.post("/:id/complete-upload", async (req, res) => {
  if (!isS3StorageEnabled()) {
    res.status(503).json({ error: "S3 upload is not enabled on this server" });
    return;
  }

  try {
    const session = await completeS3UploadSession(req.params.id, req.userId!);
    res.json(session);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.code === "UPLOAD_MISSING") {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message ?? "Upload completion failed" });
  }
});

uploadRouter.get("/storage-config", (_req, res) => {
  res.json({
    storageBackend: isS3StorageEnabled() ? "s3" : "local_path",
    s3UploadEnabled: isS3StorageEnabled(),
  });
});
