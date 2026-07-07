import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { GIT_SHA, SERVER_STARTED_AT } from "../buildInfo.js";
import {
  DATA_DIR,
  DATABASE_URL,
  DEMO_VIDEO_PATH,
  FFMPEG_PATH,
  S3_BUCKET,
  deployEnv,
  ffmpegAvailable,
  isDevUserMode,
  storageBackend,
} from "../config.js";
import { getDbKind, checkDatabaseHealth } from "../db/database.js";

export const OPS_STATUS_SCHEMA_VERSION = 1;

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const exists = fs.existsSync(DEMO_VIDEO_PATH);
  res.json({
    ok: true,
    dataDir: DATA_DIR,
    demoVideo: DEMO_VIDEO_PATH,
    demoVideoExists: exists,
    ffmpegPath: FFMPEG_PATH,
    ffmpegAvailable: ffmpegAvailable(),
    devUserMode: isDevUserMode(),
  });
});

healthRouter.get("/ops/status", async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  let dataDirWritable = false;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    dataDirWritable = true;
  } catch {
    dataDirWritable = false;
  }

  const storage = storageBackend();
  const s3Configured = storage === "s3" ? S3_BUCKET.length > 0 : true;

  res.json({
    schemaVersion: OPS_STATUS_SCHEMA_VERSION,
    ok: dbHealth.ok && ffmpegAvailable() && dataDirWritable && s3Configured,
    gitSha: GIT_SHA,
    deployEnv: deployEnv(),
    uptimeSeconds: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
    ffmpegAvailable: ffmpegAvailable(),
    dataDir: DATA_DIR,
    dataDirWritable,
    db: dbHealth,
    storageBackend: storage,
    s3Bucket: storage === "s3" ? S3_BUCKET : null,
    s3Configured,
    databaseUrlConfigured: DATABASE_URL.length > 0,
    devUserMode: isDevUserMode(),
  });
});
