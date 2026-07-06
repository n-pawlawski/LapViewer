import { apiFetch } from "./client";

export async function pickVideoFile(options?: {
  trackId?: string;
  initialDir?: string;
}): Promise<string | null> {
  const data = await apiFetch<{ path: string | null }>("/api/system/pick-video-file", {
    method: "POST",
    body: JSON.stringify(options ?? {}),
  });
  return data.path;
}

export async function pickFolder(options?: {
  trackId?: string;
  initialDir?: string;
}): Promise<string | null> {
  const data = await apiFetch<{ path: string | null }>("/api/system/pick-folder", {
    method: "POST",
    body: JSON.stringify(options ?? {}),
  });
  return data.path;
}
