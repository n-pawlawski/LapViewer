import type { Lap, Marker, Session, Split } from "../types";
import type { TrackSplit } from "./tracks";
import { apiFetch } from "./client";

export interface SessionSummary {
  id: string;
  title: string;
  sourcePath: string;
  status: Session["status"];
  track?: string;
  date?: string;
  lapCount: number;
  bestLapTimeMs?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FlatLapRow {
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionTrack?: string;
  sessionDate?: string;
  lapNumber: number;
  lapTimeMs: number;
  isBestInSession: boolean;
  ignored: boolean;
}

export interface SessionDetail extends SessionSummary {
  notes?: string;
  fileName: string;
  durationSeconds: number | null;
  markers: Marker[];
  splits: Split[];
  laps: Lap[];
  trackSplits: TrackSplit[];
}

export interface CreateSessionRequest {
  sourcePath: string;
  title?: string;
  trackName?: string;
  recordedAt?: string;
  notes?: string;
}

export interface UpdateSessionRequest {
  title?: string;
  trackName?: string | null;
  recordedAt?: string | null;
  notes?: string | null;
  durationSeconds?: number | null;
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  return apiFetch<SessionSummary[]>("/api/sessions");
}

export async function fetchSession(id: string): Promise<SessionDetail> {
  return apiFetch<SessionDetail>(`/api/sessions/${id}`);
}

export async function createSession(
  body: CreateSessionRequest,
): Promise<SessionDetail> {
  return apiFetch<SessionDetail>("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateSession(
  id: string,
  body: UpdateSessionRequest,
): Promise<SessionDetail> {
  return apiFetch<SessionDetail>(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteSession(id: string): Promise<void> {
  await apiFetch<void>(`/api/sessions/${id}`, { method: "DELETE" });
}

export async function fetchAllLaps(): Promise<FlatLapRow[]> {
  return apiFetch<FlatLapRow[]>("/api/laps");
}

export function sessionVideoUrl(sessionId: string): string {
  return `/api/video/${sessionId}`;
}

export function sessionIsPlayable(status: Session["status"]): boolean {
  return status === "ready";
}
