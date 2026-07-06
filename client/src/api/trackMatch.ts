import { apiFetch } from "./client";
import type { SessionDetail } from "./sessions";

export type ProgressJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface ReferenceBuildJobDto {
  jobId: string;
  trackId: string;
  status: ProgressJobStatus;
  progress: number;
  pointCount?: number;
  error?: string;
}

export interface TrackMatchProposalDto {
  id: string;
  kind: "lapStart" | "split";
  timeSeconds: number;
  splitIndex?: number;
  lapNumber?: number;
  confidence: number;
}

export interface ProgressCurveSampleDto {
  timestampMs: number;
  timeSec: number;
  estimatedProgress: number;
  confidence: number;
  visualScore: number;
}

export interface LowConfidenceRangeDto {
  startMs: number;
  endMs: number;
  avgConfidence: number;
}

export interface TrackMatchJobDto {
  jobId: string;
  sessionId: string;
  trackId: string;
  status: ProgressJobStatus;
  progress: number;
  curveSamples?: ProgressCurveSampleDto[];
  proposals?: TrackMatchProposalDto[];
  lowConfidenceRanges?: LowConfidenceRangeDto[];
  error?: string;
}

export async function startReferenceBuild(trackId: string): Promise<{ jobId: string }> {
  return apiFetch<{ jobId: string }>(`/api/tracks/${trackId}/reference-profile/build`, {
    method: "POST",
  });
}

export async function fetchReferenceBuildJob(jobId: string): Promise<ReferenceBuildJobDto> {
  return apiFetch<ReferenceBuildJobDto>(`/api/reference-build/${jobId}`);
}

export async function cancelReferenceBuildJob(jobId: string): Promise<void> {
  await apiFetch(`/api/reference-build/${jobId}`, { method: "DELETE" });
}

export async function startTrackMatch(
  sessionId: string,
  trackId: string,
  scanStart?: number,
  scanEnd?: number,
): Promise<{ jobId: string }> {
  return apiFetch<{ jobId: string }>(`/api/sessions/${sessionId}/match-track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, scanStart, scanEnd }),
  });
}

export async function fetchTrackMatchJob(jobId: string): Promise<TrackMatchJobDto> {
  return apiFetch<TrackMatchJobDto>(`/api/match-track/${jobId}`);
}

export async function cancelTrackMatchJob(jobId: string): Promise<void> {
  await apiFetch(`/api/match-track/${jobId}`, { method: "DELETE" });
}

export async function acceptTrackMatchProposals(
  sessionId: string,
  jobId: string,
  proposalIds: string[],
): Promise<{ session: SessionDetail; accepted: number }> {
  return apiFetch(`/api/sessions/${sessionId}/match-track/${jobId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposalIds }),
  });
}
