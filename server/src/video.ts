import fs from "node:fs";
import type { Request, Response } from "express";

const VIDEO_CONTENT_TYPE = "video/mp4";

export function streamVideoFile(filePath: string, req: Request, res: Response): void {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Video file not found", path: filePath });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

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

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": VIDEO_CONTENT_TYPE,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": fileSize,
    "Content-Type": VIDEO_CONTENT_TYPE,
    "Accept-Ranges": "bytes",
  });
  fs.createReadStream(filePath).pipe(res);
}
