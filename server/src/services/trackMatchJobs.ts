import { randomUUID } from "node:crypto";
import type {
  LowConfidenceRange,
  ProgressCurvePoint,
  TrackMatchProposal,
} from "./trackProgressMath.js";

export type TrackMatchJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface TrackMatchJobSnapshot {
  jobId: string;
  sessionId: string;
  trackId: string;
  status: TrackMatchJobStatus;
  progress: number;
  curveSamples?: ProgressCurvePoint[];
  proposals?: TrackMatchProposal[];
  lowConfidenceRanges?: LowConfidenceRange[];
  error?: string;
}

interface TrackMatchJob extends TrackMatchJobSnapshot {
  cancelled: boolean;
}

const jobs = new Map<string, TrackMatchJob>();

function snapshot(job: TrackMatchJob): TrackMatchJobSnapshot {
  return {
    jobId: job.jobId,
    sessionId: job.sessionId,
    trackId: job.trackId,
    status: job.status,
    progress: job.progress,
    curveSamples: job.curveSamples,
    proposals: job.proposals,
    lowConfidenceRanges: job.lowConfidenceRanges,
    error: job.error,
  };
}

export function createTrackMatchJob(sessionId: string, trackId: string): TrackMatchJob {
  const jobId = randomUUID();
  const job: TrackMatchJob = {
    jobId,
    sessionId,
    trackId,
    status: "queued",
    progress: 0,
    cancelled: false,
  };
  jobs.set(jobId, job);
  return job;
}

export function getTrackMatchJob(jobId: string): TrackMatchJobSnapshot | null {
  const job = jobs.get(jobId);
  return job ? snapshot(job) : null;
}

export function getTrackMatchJobInternal(jobId: string): TrackMatchJob | undefined {
  return jobs.get(jobId);
}

export function markTrackMatchJobRunning(jobId: string): void {
  const job = jobs.get(jobId);
  if (job) job.status = "running";
}

export function updateTrackMatchJobProgress(jobId: string, progress: number): void {
  const job = jobs.get(jobId);
  if (job && job.status === "running") {
    job.progress = Math.min(1, Math.max(0, progress));
  }
}

export function completeTrackMatchJob(
  jobId: string,
  result: {
    curveSamples: ProgressCurvePoint[];
    proposals: TrackMatchProposal[];
    lowConfidenceRanges: LowConfidenceRange[];
  },
): void {
  const job = jobs.get(jobId);
  if (!job || job.cancelled) return;
  job.status = "done";
  job.progress = 1;
  job.curveSamples = result.curveSamples;
  job.proposals = result.proposals;
  job.lowConfidenceRanges = result.lowConfidenceRanges;
}

export function failTrackMatchJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = job.cancelled ? "cancelled" : "error";
  job.error = error;
}

export function cancelTrackMatchJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
    return false;
  }
  job.cancelled = true;
  job.status = "cancelled";
  return true;
}
