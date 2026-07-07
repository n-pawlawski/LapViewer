const MP4_EXTENSION = /\.mp4$/i;

const MP4_MIME_TYPES = new Set([
  "video/mp4",
  "application/mp4",
  "video/x-m4v",
]);

/** GoPro / Windows often reports generic MIME for MP4. */
function mimeLooksAcceptable(file: File): boolean {
  const type = file.type.trim().toLowerCase();
  if (!type || type === "application/octet-stream") return true;
  return MP4_MIME_TYPES.has(type);
}

export function isValidMp4File(file: File): boolean {
  if (!MP4_EXTENSION.test(file.name)) return false;
  return mimeLooksAcceptable(file);
}

export function mp4ValidationMessage(file: File | null): string | null {
  if (!file) return null;
  if (!MP4_EXTENSION.test(file.name)) {
    return "Only .MP4 files are supported.";
  }
  if (!mimeLooksAcceptable(file)) {
    return `Unexpected file type (${file.type || "unknown"}). Choose an MP4 video.`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
