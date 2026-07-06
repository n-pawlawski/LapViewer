import { apiFetch, ApiError } from "./client";
import type { TrackSplit } from "./tracks";

export interface ReferenceProfileCrop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ReferenceProfile {
  id: string;
  trackId: string;
  referenceSessionId: string;
  referenceLapNumber: number;
  referenceStartMarkerId?: string;
  referenceEndMarkerId?: string;
  referenceStartSeconds: number;
  referenceEndSeconds: number;
  crop: ReferenceProfileCrop;
  direction: "clockwise" | "counterclockwise" | "unknown";
  scanFps: number;
  minLapTimeMs: number;
  maxProgressJumpPerSec: number;
  lapBoundaryConfidenceMin: number;
  splitConfidenceMin: number;
  referencePointCount: number;
  splits: TrackSplit[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveReferenceProfileRequest {
  referenceSessionId: string;
  referenceLapNumber: number;
  direction?: ReferenceProfile["direction"];
}

export async function fetchReferenceProfile(
  trackId: string,
): Promise<ReferenceProfile | null> {
  try {
    return await apiFetch<ReferenceProfile>(`/api/tracks/${trackId}/reference-profile`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveReferenceProfile(
  trackId: string,
  body: SaveReferenceProfileRequest,
): Promise<ReferenceProfile> {
  return apiFetch<ReferenceProfile>(`/api/tracks/${trackId}/reference-profile`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
