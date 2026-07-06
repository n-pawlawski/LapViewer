import { randomUUID } from "node:crypto";
import type { SplitDetectionProposalDto } from "../types.js";

export type SplitDetectionJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface SplitDetectionJobSnapshot {
  jobId: string;
  sessionId: string;
  lapNumber: number;
  status: SplitDetectionJobStatus;
  progress: number;
  proposals?: SplitDetectionProposalDto[];
  error?: string;
}

interface SplitDetectionJob extends SplitDetectionJobSnapshot {
  cancelled: boolean;
}

const jobs = new Map<string, SplitDetectionJob>();

function snapshot(job: SplitDetectionJob): SplitDetectionJobSnapshot {
  return {
    jobId: job.jobId,
    sessionId: job.sessionId,
    lapNumber: job.lapNumber,
    status: job.status,
    progress: job.progress,
    proposals: job.proposals,
    error: job.error,
  };
}

export function createSplitDetectionJob(sessionId: string, lapNumber: number): SplitDetectionJob {
  const jobId = randomUUID();
  const job: SplitDetectionJob = {
    jobId,
    sessionId,
    lapNumber,
    status: "queued",
    progress: 0,
    cancelled: false,
  };
  jobs.set(jobId, job);
  return job;
}

export function getSplitDetectionJob(jobId: string): SplitDetectionJobSnapshot | null {
  const job = jobs.get(jobId);
  return job ? snapshot(job) : null;
}

export function getSplitDetectionJobInternal(jobId: string): SplitDetectionJob | undefined {
  return jobs.get(jobId);
}

export function markSplitDetectionJobRunning(jobId: string): void {
  const job = jobs.get(jobId);
  if (job) job.status = "running";
}

export function updateSplitDetectionJobProgress(jobId: string, progress: number): void {
  const job = jobs.get(jobId);
  if (job && job.status === "running") {
    job.progress = Math.min(1, Math.max(0, progress));
  }
}

export function completeSplitDetectionJob(
  jobId: string,
  proposals: SplitDetectionProposalDto[],
): void {
  const job = jobs.get(jobId);
  if (!job || job.cancelled) return;
  job.status = "done";
  job.progress = 1;
  job.proposals = proposals;
}

export function failSplitDetectionJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = job.cancelled ? "cancelled" : "error";
  job.error = error;
}

export function cancelSplitDetectionJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
    return false;
  }
  job.cancelled = true;
  job.status = "cancelled";
  return true;
}
