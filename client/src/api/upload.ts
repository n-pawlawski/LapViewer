import { apiFetch } from "./client";

export interface StorageConfig {
  storageBackend: "local_path" | "s3";
  s3UploadEnabled: boolean;
}

export interface UploadUrlResponse {
  sessionId: string;
  uploadUrl: string;
  objectKey: string;
}

export async function fetchStorageConfig(): Promise<StorageConfig> {
  return apiFetch<StorageConfig>("/api/sessions/storage-config");
}

export async function requestUploadUrl(body: {
  fileName: string;
  title?: string;
  trackName?: string | null;
  recordedAt?: string | null;
  notes?: string | null;
  contentType?: string;
}): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>("/api/sessions/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function completeUpload(sessionId: string): Promise<import("./sessions").SessionDetail> {
  return apiFetch(`/api/sessions/${sessionId}/complete-upload`, {
    method: "POST",
  });
}

export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(file);
  });
}
