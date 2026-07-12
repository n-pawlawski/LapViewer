import fs from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Request, Response } from "express";
import {
  AWS_ENDPOINT_URL,
  AWS_REGION,
  DATA_DIR,
  S3_BUCKET,
  S3_FORCE_PATH_STYLE,
  S3_PUBLIC_ENDPOINT,
  storageBackend,
} from "../config.js";
import { logger } from "../logger.js";
import { pipeStreamToResponse, streamVideoFile } from "../video.js";

let s3Client: S3Client | null = null;
let s3PublicClient: S3Client | null = null;

function buildS3ClientConfig(endpoint?: string): S3ClientConfig {
  const config: S3ClientConfig = { region: AWS_REGION };
  const resolvedEndpoint = endpoint || AWS_ENDPOINT_URL;
  if (resolvedEndpoint) {
    config.endpoint = resolvedEndpoint;
    config.forcePathStyle = S3_FORCE_PATH_STYLE;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
  }
  return config;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(buildS3ClientConfig());
  }
  return s3Client;
}

/** Client used only for presigned URLs the browser must reach. */
function getS3PublicClient(): S3Client {
  if (!s3PublicClient) {
    s3PublicClient = new S3Client(buildS3ClientConfig(S3_PUBLIC_ENDPOINT || AWS_ENDPOINT_URL));
  }
  return s3PublicClient;
}

export function isS3StorageEnabled(): boolean {
  return storageBackend() === "s3" && S3_BUCKET.length > 0;
}

/** True when browser upload is available (always — direct or presigned). */
export function isUploadEnabled(): boolean {
  return true;
}

export type UploadMode = "direct" | "presigned";

/** Direct server upload is default — no MinIO sidecar or presigned URL setup required. */
export function uploadMode(): UploadMode {
  return "direct";
}

export function storageBackendLabel(): "s3" | "local_objects" {
  return isS3StorageEnabled() ? "s3" : "local_objects";
}

export function localObjectPath(objectKey: string): string {
  return path.join(DATA_DIR, "objects", objectKey);
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
  const signingClient =
    S3_PUBLIC_ENDPOINT && S3_PUBLIC_ENDPOINT !== AWS_ENDPOINT_URL
      ? getS3PublicClient()
      : getS3Client();
  const uploadUrl = await getSignedUrl(signingClient, command, {
    expiresIn: input.expiresInSeconds ?? 3600,
  });
  return { uploadUrl, objectKey: input.objectKey };
}

/** Presigned GET URL so the browser streams large objects directly from S3/MinIO. */
export async function createPlaybackPresignedUrl(input: {
  objectKey: string;
  expiresInSeconds?: number;
}): Promise<string> {
  if (!isS3StorageEnabled()) {
    throw new Error("S3 storage is not configured");
  }
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: input.objectKey,
  });
  const signingClient =
    S3_PUBLIC_ENDPOINT && S3_PUBLIC_ENDPOINT !== AWS_ENDPOINT_URL
      ? getS3PublicClient()
      : getS3Client();
  return getSignedUrl(signingClient, command, {
    expiresIn: input.expiresInSeconds ?? 3600,
  });
}

export async function putObjectFromFile(input: {
  objectKey: string;
  filePath: string;
  contentType?: string;
}): Promise<void> {
  const contentType = input.contentType ?? "video/mp4";
  if (isS3StorageEnabled()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: input.objectKey,
        Body: createReadStream(input.filePath),
        ContentType: contentType,
      }),
    );
    return;
  }

  const dest = localObjectPath(input.objectKey);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmpDest = `${dest}.part`;
  await pipeline(createReadStream(input.filePath), fs.createWriteStream(tmpDest));
  fs.renameSync(tmpDest, dest);
}

export async function downloadObjectToFile(
  objectKey: string,
  destPath: string,
): Promise<void> {
  if (isS3StorageEnabled()) {
    await downloadS3ObjectToFile(objectKey, destPath);
    return;
  }

  const source = localObjectPath(objectKey);
  if (!fs.existsSync(source)) {
    throw new Error("Object not found");
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(source, destPath);
}

/** @deprecated Use downloadObjectToFile */
export async function downloadS3ObjectToFile(
  objectKey: string,
  destPath: string,
): Promise<void> {
  if (!isS3StorageEnabled()) {
    throw new Error("S3 storage is not configured");
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const result = await getS3Client().send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
  );
  const body = result.Body;
  if (!body || typeof (body as NodeJS.ReadableStream).pipe !== "function") {
    throw new Error("Invalid S3 response body");
  }
  const tmpPath = `${destPath}.part`;
  const writeStream = fs.createWriteStream(tmpPath);
  await pipeline(body as NodeJS.ReadableStream, writeStream);
  fs.renameSync(tmpPath, destPath);
}

export async function headObject(objectKey: string): Promise<{ size: number; exists: boolean }> {
  if (isS3StorageEnabled()) {
    return headS3Object(objectKey);
  }
  const filePath = localObjectPath(objectKey);
  if (!fs.existsSync(filePath)) {
    return { size: 0, exists: false };
  }
  return { size: fs.statSync(filePath).size, exists: true };
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

export async function streamStoredObject(
  objectKey: string,
  req: Request,
  res: Response,
): Promise<void> {
  if (isS3StorageEnabled()) {
    await streamS3Object(objectKey, req, res);
    return;
  }
  const filePath = localObjectPath(objectKey);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Video object not found" });
    return;
  }
  streamVideoFile(filePath, req, res);
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
    pipeStreamToResponse(body as NodeJS.ReadableStream, req, res);
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
  pipeStreamToResponse(body as NodeJS.ReadableStream, req, res);
}
