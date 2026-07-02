export interface TrackSplit {
  id: string;
  trackId: string;
  splitIndex: number;
  name: string;
}

export interface Track {
  id: string;
  name: string;
  videoFolder?: string;
  notes?: string;
  splitCount: number;
  splits?: TrackSplit[];
}

export interface CreateTrackRequest {
  name: string;
  videoFolder?: string;
  notes?: string;
}

export interface UpdateTrackRequest {
  name?: string;
  videoFolder?: string;
  notes?: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function fetchTracks(): Promise<Track[]> {
  return apiFetch<Track[]>("/api/tracks");
}

export async function fetchTrack(id: string): Promise<Track> {
  return apiFetch<Track>(`/api/tracks/${id}`);
}

export async function createTrack(body: CreateTrackRequest): Promise<Track> {
  return apiFetch<Track>("/api/tracks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateTrack(
  id: string,
  body: UpdateTrackRequest,
): Promise<Track> {
  return apiFetch<Track>(`/api/tracks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteTrack(id: string): Promise<void> {
  await apiFetch<void>(`/api/tracks/${id}`, { method: "DELETE" });
}

export async function replaceTrackSplits(
  trackId: string,
  splits: { name: string }[],
): Promise<{ splits: TrackSplit[]; track: Track }> {
  return apiFetch<{ splits: TrackSplit[]; track: Track }>(`/api/tracks/${trackId}/splits`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ splits }),
  });
}
