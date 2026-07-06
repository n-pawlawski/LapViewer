import fs from "node:fs";
import { spawnSync } from "node:child_process";

const WINDOWS_CANDIDATES = [
  "C:\\Program Files\\CleverGet\\CleverGet\\ffmpeg.exe",
  "C:\\ffmpeg\\bin\\ffmpeg.exe",
];

function ffmpegWorks(binary: string): boolean {
  try {
    if (binary.includes("\\") || binary.includes("/")) {
      if (!fs.existsSync(binary)) return false;
    }
    const result = spawnSync(binary, ["-version"], { encoding: "utf8" });
    return result.status === 0;
  } catch {
    return false;
  }
}

/** Resolve an HEVC-capable ffmpeg binary for frame extraction. */
export function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && ffmpegWorks(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  if (ffmpegWorks("ffmpeg")) {
    return "ffmpeg";
  }

  for (const candidate of WINDOWS_CANDIDATES) {
    if (ffmpegWorks(candidate)) {
      return candidate;
    }
  }

  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

export const FFMPEG_PATH = resolveFfmpegPath();

export function ffmpegAvailable(): boolean {
  return ffmpegWorks(FFMPEG_PATH);
}
