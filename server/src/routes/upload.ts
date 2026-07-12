import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sessionVideoUpload } from "../middleware/upload.js";
import { assertValidMp4Upload } from "../utils/videoFileValidation.js";
import {
  completeS3UploadSession,
  createS3UploadSession,
} from "../services/sessions.js";
import {
  createUploadPresignedUrl,
  isS3StorageEnabled,
  isUploadEnabled,
  putObjectFromFile,
  storageBackendLabel,
  uploadMode,
} from "../services/objectStorage.js";

export const uploadRouter = Router();

uploadRouter.get("/storage-config", (_req, res) => {
  const mode = uploadMode();
  res.json({
    storageBackend: storageBackendLabel(),
    uploadEnabled: isUploadEnabled(),
    uploadMode: mode,
    /** @deprecated use uploadEnabled */
    s3UploadEnabled: isUploadEnabled(),
  });
});

/** Direct upload — file goes through the app server (works without MinIO sidecar or presigned URLs). */
uploadRouter.post("/upload", (req, res, next) => {
  sessionVideoUpload.single("file")(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload rejected" });
      return;
    }
    next();
  });
}, async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "file is required (multipart field name: file)" });
      return;
    }

    try {
      assertValidMp4Upload(file);
    } catch (err) {
      const error = err as Error & { code?: string };
      fs.unlink(file.path, () => {});
      res.status(400).json({ error: error.message });
      return;
    }

    const body = req.body as {
      title?: string;
      trackName?: string;
      recordedAt?: string | null;
      notes?: string | null;
    };

    const sessionId = randomUUID();
    const fileName = path.basename(file.originalname);

    try {
      const session = createS3UploadSession(
        {
          sessionId,
          fileName,
          title: body.title,
          trackName: body.trackName ?? null,
          recordedAt: body.recordedAt ?? null,
          notes: body.notes ?? null,
        },
        req.userId!,
      );

      await putObjectFromFile({
        objectKey: session.objectKey!,
        filePath: file.path,
        contentType: file.mimetype || "video/mp4",
      });

      const completed = await completeS3UploadSession(sessionId, req.userId!);

      if (!res.headersSent) {
        res.status(201).json(completed);
      }
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    } finally {
      fs.unlink(file.path, () => {});
    }
  });

uploadRouter.post("/upload-url", async (req, res) => {
  if (!isS3StorageEnabled()) {
    res.status(503).json({
      error: "Presigned upload requires S3. Use POST /api/sessions/upload instead.",
    });
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

  if (!/\.mp4$/i.test(path.basename(body.fileName))) {
    res.status(400).json({ error: "Only .MP4 files are supported" });
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
    res.status(503).json({
      error: "Presigned upload requires S3. Use POST /api/sessions/upload instead.",
    });
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
