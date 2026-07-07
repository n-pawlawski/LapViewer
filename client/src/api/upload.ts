import { apiFetch } from "./client";
import type { SessionDetail } from "./sessions";

export interface StorageConfig {
  storageBackend: "local_path" | "s3" | "local_objects";
  uploadEnabled: boolean;
  uploadMode: "direct" | "presigned";
  /** @deprecated use uploadEnabled */
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

export async function completeUpload(sessionId: string): Promise<SessionDetail> {
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

/** Direct upload through the app server — works without MinIO or S3 env setup. */
export async function uploadSessionFile(
  file: File,
  metadata: {
    title?: string;
    trackName?: string | null;
    recordedAt?: string | null;
    notes?: string | null;
  },
  onProgress?: (percent: number) => void,
): Promise<SessionDetail> {
  const form = new FormData();
  form.append("file", file);
  if (metadata.title) form.append("title", metadata.title);
  if (metadata.trackName) form.append("trackName", metadata.trackName);
  if (metadata.recordedAt) form.append("recordedAt", metadata.recordedAt);
  if (metadata.notes) form.append("notes", metadata.notes);

  return new Promise<SessionDetail>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/sessions/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as SessionDetail);
        } catch {
          reject(new Error("Invalid server response"));
        }
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        reject(new Error(body.error ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(form);
  });
}
