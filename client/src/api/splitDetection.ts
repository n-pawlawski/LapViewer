import { apiFetch } from "./client";

export type SplitDetectionJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface SplitBankSummaryDto {
  trackId: string;
  bySplitIndex: Record<number, number>;
  medianOffsetBySplitIndex: Record<number, number>;
  totalEntries: number;
}

export interface SplitDetectionProposalDto {
  id: string;
  splitIndex: number;
  label: string;
  timeSeconds: number;
  score: number;
  confidence: number;
}

export interface SplitDetectionJobDto {
  jobId: string;
  sessionId: string;
  lapNumber: number;
  status: SplitDetectionJobStatus;
  progress: number;
  proposals?: SplitDetectionProposalDto[];
  error?: string;
}

export async function fetchSplitBankSummary(trackId: string): Promise<SplitBankSummaryDto> {
  return apiFetch<SplitBankSummaryDto>(`/api/tracks/${trackId}/split-bank`);
}

export async function startSplitDetection(
  sessionId: string,
  lapNumber: number,
): Promise<{ jobId: string }> {
  return apiFetch<{ jobId: string }>(`/api/sessions/${sessionId}/detect-splits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lapNumber }),
  });
}

export async function fetchSplitDetectionJob(jobId: string): Promise<SplitDetectionJobDto> {
  return apiFetch<SplitDetectionJobDto>(`/api/detect-splits/${jobId}`);
}

export async function cancelSplitDetectionJob(jobId: string): Promise<void> {
  await apiFetch(`/api/detect-splits/${jobId}`, { method: "DELETE" });
}
