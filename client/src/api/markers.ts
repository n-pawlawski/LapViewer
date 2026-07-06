import type { Marker } from "../types";
import type { SessionDetail } from "./sessions";
import { apiFetch } from "./client";

export interface MarkerMutationResponse {
  marker: Marker;
  session: SessionDetail;
}

export interface MarkerDeleteResponse {
  session: SessionDetail;
}

export async function createMarker(
  sessionId: string,
  timeSeconds: number,
  options?: { kind?: "lapStart" | "split"; lapNumber?: number; splitIndex?: number; label?: string },
): Promise<MarkerMutationResponse> {
  return apiFetch<MarkerMutationResponse>(`/api/sessions/${sessionId}/markers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeSeconds,
      kind: options?.kind,
      lapNumber: options?.lapNumber,
      splitIndex: options?.splitIndex,
      label: options?.label,
    }),
  });
}

export async function createSplit(
  sessionId: string,
  lapNumber: number,
  splitIndex: number,
  timeSeconds: number,
): Promise<MarkerMutationResponse> {
  return createMarker(sessionId, timeSeconds, {
    kind: "split",
    lapNumber,
    splitIndex,
  });
}

export async function updateMarker(
  markerId: string,
  body: { timeSeconds?: number; ignored?: boolean },
): Promise<MarkerMutationResponse> {
  return apiFetch<MarkerMutationResponse>(`/api/markers/${markerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteMarker(markerId: string): Promise<MarkerDeleteResponse> {
  return apiFetch<MarkerDeleteResponse>(`/api/markers/${markerId}`, {
    method: "DELETE",
  });
}
