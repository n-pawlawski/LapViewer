import { apiFetch } from "./client";

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

export async function fetchTracks(): Promise<Track[]> {
  return apiFetch<Track[]>("/api/tracks");
}

export async function fetchTrack(id: string): Promise<Track> {
  return apiFetch<Track>(`/api/tracks/${id}`);
}

export async function createTrack(body: CreateTrackRequest): Promise<Track> {
  return apiFetch<Track>("/api/tracks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTrack(
  id: string,
  body: UpdateTrackRequest,
): Promise<Track> {
  return apiFetch<Track>(`/api/tracks/${id}`, {
    method: "PATCH",
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
    body: JSON.stringify({ splits }),
  });
}
