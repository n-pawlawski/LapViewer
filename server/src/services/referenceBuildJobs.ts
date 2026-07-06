import { randomUUID } from "node:crypto";

export type ReferenceBuildJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface ReferenceBuildJobSnapshot {
  jobId: string;
  trackId: string;
  status: ReferenceBuildJobStatus;
  progress: number;
  pointCount?: number;
  error?: string;
}

interface ReferenceBuildJob extends ReferenceBuildJobSnapshot {
  cancelled: boolean;
}

const jobs = new Map<string, ReferenceBuildJob>();

function snapshot(job: ReferenceBuildJob): ReferenceBuildJobSnapshot {
  return {
    jobId: job.jobId,
    trackId: job.trackId,
    status: job.status,
    progress: job.progress,
    pointCount: job.pointCount,
    error: job.error,
  };
}

export function createReferenceBuildJob(trackId: string): ReferenceBuildJob {
  const jobId = randomUUID();
  const job: ReferenceBuildJob = {
    jobId,
    trackId,
    status: "queued",
    progress: 0,
    cancelled: false,
  };
  jobs.set(jobId, job);
  return job;
}

export function getReferenceBuildJob(jobId: string): ReferenceBuildJobSnapshot | null {
  const job = jobs.get(jobId);
  return job ? snapshot(job) : null;
}

export function getReferenceBuildJobInternal(jobId: string): ReferenceBuildJob | undefined {
  return jobs.get(jobId);
}

export function markReferenceBuildJobRunning(jobId: string): void {
  const job = jobs.get(jobId);
  if (job) job.status = "running";
}

export function updateReferenceBuildJobProgress(jobId: string, progress: number): void {
  const job = jobs.get(jobId);
  if (job && job.status === "running") {
    job.progress = Math.min(1, Math.max(0, progress));
  }
}

export function completeReferenceBuildJob(jobId: string, pointCount: number): void {
  const job = jobs.get(jobId);
  if (!job || job.cancelled) return;
  job.status = "done";
  job.progress = 1;
  job.pointCount = pointCount;
}

export function failReferenceBuildJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = job.cancelled ? "cancelled" : "error";
  job.error = error;
}

export function cancelReferenceBuildJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
    return false;
  }
  job.cancelled = true;
  job.status = "cancelled";
  return true;
}
