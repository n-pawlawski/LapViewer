import { randomUUID } from "node:crypto";
import type { DetectionProposal } from "./lapDetectionMath.js";

export type DetectionJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface DetectionJobSnapshot {
  jobId: string;
  sessionId: string;
  status: DetectionJobStatus;
  progress: number;
  proposals?: DetectionProposal[];
  lapTimeMs?: number;
  error?: string;
}

interface DetectionJob extends DetectionJobSnapshot {
  cancelled: boolean;
}

const jobs = new Map<string, DetectionJob>();

function snapshot(job: DetectionJob): DetectionJobSnapshot {
  return {
    jobId: job.jobId,
    sessionId: job.sessionId,
    status: job.status,
    progress: job.progress,
    proposals: job.proposals,
    lapTimeMs: job.lapTimeMs,
    error: job.error,
  };
}

export function createDetectionJob(sessionId: string): DetectionJob {
  const jobId = randomUUID();
  const job: DetectionJob = {
    jobId,
    sessionId,
    status: "queued",
    progress: 0,
    cancelled: false,
  };
  jobs.set(jobId, job);
  return job;
}

export function getDetectionJob(jobId: string): DetectionJobSnapshot | null {
  const job = jobs.get(jobId);
  return job ? snapshot(job) : null;
}

export function getDetectionJobInternal(jobId: string): DetectionJob | undefined {
  return jobs.get(jobId);
}

export function markDetectionJobRunning(jobId: string): void {
  const job = jobs.get(jobId);
  if (job) {
    job.status = "running";
  }
}

export function updateDetectionJobProgress(jobId: string, progress: number): void {
  const job = jobs.get(jobId);
  if (job && job.status === "running") {
    job.progress = Math.min(1, Math.max(0, progress));
  }
}

export function completeDetectionJob(
  jobId: string,
  result: { proposals: DetectionProposal[]; lapTimeMs: number },
): void {
  const job = jobs.get(jobId);
  if (!job || job.cancelled) return;
  job.status = "done";
  job.progress = 1;
  job.proposals = result.proposals;
  job.lapTimeMs = result.lapTimeMs;
}

export function failDetectionJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = job.cancelled ? "cancelled" : "error";
  job.error = error;
}

export function cancelDetectionJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
    return false;
  }
  job.cancelled = true;
  job.status = "cancelled";
  return true;
}
