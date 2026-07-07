import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Request, Response } from "express";
import { AWS_REGION, S3_BUCKET, storageBackend } from "../config.js";
import { logger } from "../logger.js";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: AWS_REGION });
  }
  return s3Client;
}

export function isS3StorageEnabled(): boolean {
  return storageBackend() === "s3" && S3_BUCKET.length > 0;
}

export function sessionObjectKey(userId: string, sessionId: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, "_");
  return `users/${userId}/sessions/${sessionId}/${safeName}`;
}

export async function createUploadPresignedUrl(input: {
  objectKey: string;
  contentType?: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; objectKey: string }> {
  if (!isS3StorageEnabled()) {
    throw new Error("S3 storage is not configured");
  }
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: input.objectKey,
    ContentType: input.contentType ?? "video/mp4",
  });
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: input.expiresInSeconds ?? 3600,
  });
  return { uploadUrl, objectKey: input.objectKey };
}

export async function headS3Object(objectKey: string): Promise<{ size: number; exists: boolean }> {
  if (!isS3StorageEnabled()) return { size: 0, exists: false };
  try {
    const result = await getS3Client().send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
    );
    return { size: result.ContentLength ?? 0, exists: true };
  } catch {
    return { size: 0, exists: false };
  }
}

export async function streamS3Object(
  objectKey: string,
  req: Request,
  res: Response,
): Promise<void> {
  if (!isS3StorageEnabled()) {
    res.status(503).json({ error: "S3 storage is not configured" });
    return;
  }

  const range = req.headers.range;
  let head;
  try {
    head = await getS3Client().send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
    );
  } catch (err) {
    logger.warn("s3_head_failed", { objectKey, err: String(err) });
    res.status(404).json({ error: "Video object not found" });
    return;
  }

  const fileSize = head.ContentLength ?? 0;
  const contentType = head.ContentType ?? "video/mp4";

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.status(416).send("Invalid Range header");
      return;
    }
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
      return;
    }
    const result = await getS3Client().send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: objectKey,
        Range: `bytes=${start}-${end}`,
      }),
    );
    const body = result.Body;
    if (!body || typeof (body as NodeJS.ReadableStream).pipe !== "function") {
      res.status(500).json({ error: "Invalid S3 response body" });
      return;
    }
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": contentType,
    });
    (body as NodeJS.ReadableStream).pipe(res);
    return;
  }

  const result = await getS3Client().send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
  );
  const body = result.Body;
  if (!body || typeof (body as NodeJS.ReadableStream).pipe !== "function") {
    res.status(500).json({ error: "Invalid S3 response body" });
    return;
  }
  res.writeHead(200, {
    "Content-Length": fileSize,
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  });
  (body as NodeJS.ReadableStream).pipe(res);
}
