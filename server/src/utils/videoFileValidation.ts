import fs from "node:fs";
import path from "node:path";

const MP4_EXTENSION = /\.mp4$/i;

export function isValidMp4FileName(fileName: string): boolean {
  return MP4_EXTENSION.test(path.basename(fileName));
}

/** ISO BMFF files start with a size box then `ftyp`. */
export function isMp4FileHeader(filePath: string): boolean {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    if (bytesRead < 8) return false;
    return buf.toString("ascii", 4, 8) === "ftyp";
  } finally {
    fs.closeSync(fd);
  }
}

export function assertValidMp4Upload(file: { originalname: string; path: string }): void {
  if (!isValidMp4FileName(file.originalname)) {
    throw Object.assign(new Error("Only .MP4 files are supported"), { code: "INVALID_FILE_TYPE" });
  }
  if (!isMp4FileHeader(file.path)) {
    throw Object.assign(new Error("File does not look like a valid MP4"), { code: "INVALID_FILE_TYPE" });
  }
}
