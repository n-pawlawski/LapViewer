export async function pickVideoFile(options?: {
  trackId?: string;
  initialDir?: string;
}): Promise<string | null> {
  const res = await fetch("/api/system/pick-video-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  const data = (await res.json()) as { path: string | null };
  return data.path;
}

export async function pickFolder(options?: {
  trackId?: string;
  initialDir?: string;
}): Promise<string | null> {
  const res = await fetch("/api/system/pick-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  const data = (await res.json()) as { path: string | null };
  return data.path;
}
