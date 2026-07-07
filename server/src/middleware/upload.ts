import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { DATA_DIR } from "../config.js";

const uploadTmpDir = path.join(DATA_DIR, "tmp", "uploads");
fs.mkdirSync(uploadTmpDir, { recursive: true });

/** Disk-backed multipart parser — avoids loading multi-GB GoPro files into RAM. */
export const sessionVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadTmpDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.-]+/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 64 * 1024 * 1024 * 1024 },
});
