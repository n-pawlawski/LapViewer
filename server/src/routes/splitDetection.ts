import { Router } from "express";
import {
  cancelSplitDetectionJob,
  completeSplitDetectionJob,
  createSplitDetectionJob,
  failSplitDetectionJob,
  getSplitDetectionJob,
  getSplitDetectionJobInternal,
  markSplitDetectionJobRunning,
  updateSplitDetectionJobProgress,
} from "../services/splitDetectionJobs.js";
import { runSplitDetection } from "../services/splitDetection.js";
import {
  getSplitBankSummary,
  trackHasBankDataForSplitIndices,
} from "../services/splitBank.js";
import { missingSplitIndicesForLap } from "../services/splitDetectionMath.js";
import { getSessionById } from "../services/sessions.js";
import { resolveSessionMediaPath } from "../services/sessionMedia.js";
import { getTrackById, getTrackByName } from "../services/tracks.js";
import type { StartSplitDetectionBody, SplitDetectionProposalDto } from "../types.js";

export const splitDetectionRouter = Router();

function jobOwnedByUser(jobId: string, userId: string): boolean {
  const job = getSplitDetectionJob(jobId);
  if (!job) return false;
  return getSessionById(job.sessionId, userId) != null;
}

splitDetectionRouter.get("/:jobId", (req, res) => {
  if (!jobOwnedByUser(req.params.jobId, req.userId!)) {
    res.status(404).json({ error: "Split detection job not found" });
    return;
  }
  res.json(getSplitDetectionJob(req.params.jobId));
});

splitDetectionRouter.delete("/:jobId", (req, res) => {
  if (!jobOwnedByUser(req.params.jobId, req.userId!)) {
    res.status(404).json({ error: "Split detection job not found" });
    return;
  }
  const cancelled = cancelSplitDetectionJob(req.params.jobId);
  if (!cancelled) {
    const job = getSplitDetectionJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "Split detection job not found" });
      return;
    }
    res.status(409).json({ error: "Job cannot be cancelled", status: job.status });
    return;
  }
  res.json({ jobId: req.params.jobId, status: "cancelled" });
});

export const sessionSplitDetectionRouter = Router({ mergeParams: true });

export const trackSplitBankRouter = Router({ mergeParams: true });

trackSplitBankRouter.get("/:trackId/split-bank", (req, res) => {
  const track = getTrackById(req.params.trackId, req.userId!);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }
  res.json(getSplitBankSummary(track.id, req.userId!));
});

sessionSplitDetectionRouter.post("/:id/detect-splits", (req, res) => {
  const session = getSessionById(req.params.id, req.userId!);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const body = req.body as StartSplitDetectionBody;
  const lapNumber = body?.lapNumber;
  if (!Number.isInteger(lapNumber) || lapNumber! < 1) {
    res.status(400).json({ error: "lapNumber (1-based) is required" });
    return;
  }

  if (!session.track) {
    res.status(400).json({ error: "Session has no track assigned" });
    return;
  }

  const track = getTrackByName(session.track, req.userId!);
  if (!track?.splits?.length) {
    res.status(400).json({ error: "Track has no splits configured" });
    return;
  }

  const lap = session.laps.find((l) => l.lapNumber === lapNumber);
  if (!lap) {
    res.status(400).json({ error: `Lap ${lapNumber} not found` });
    return;
  }

  const lapSplits = session.splits.filter((s) => s.lapNumber === lapNumber);

  const bankSummary = getSplitBankSummary(track.id, req.userId!);
  const medianOffsetMap = new Map(
    Object.entries(bankSummary.medianOffsetBySplitIndex).map(([k, v]) => [Number(k), v]),
  );

  const missingSplitIndices = missingSplitIndicesForLap(
    lap.startSeconds,
    lapSplits.map((s) => ({ splitIndex: s.splitIndex, timeSeconds: s.timeSeconds })),
    track.splits,
    medianOffsetMap,
  );

  if (missingSplitIndices.length === 0) {
    res.status(400).json({ error: "Lap has no missing splits" });
    return;
  }

  if (!trackHasBankDataForSplitIndices(track.id, missingSplitIndices)) {
    res.status(400).json({
      error:
        "Track has no reference images for the missing splits — mark splits manually on another lap first",
    });
    return;
  }

  const job = createSplitDetectionJob(session.id, lapNumber!);
  res.status(202).json({ jobId: job.jobId });

  void (async () => {
    markSplitDetectionJobRunning(job.jobId);
    try {
      const sourcePath = await resolveSessionMediaPath(session.id, req.userId!);
      if (!sourcePath) {
        failSplitDetectionJob(job.jobId, "Session video not found");
        return;
      }

      const result = await runSplitDetection({
        videoPath: sourcePath,
        sessionId: session.id,
        trackId: track.id,
        lapStartSec: lap.startSeconds,
        lapEndSec: lap.endSeconds,
        missingSplitIndices,
        onProgress: (p) => updateSplitDetectionJobProgress(job.jobId, p),
        isCancelled: () => getSplitDetectionJobInternal(job.jobId)?.cancelled === true,
      });

      const proposals: SplitDetectionProposalDto[] = result.proposals.map((p) => {
        const trackSplit = track.splits!.find((s) => s.splitIndex === p.splitIndex);
        return {
          id: `split-${lapNumber}-${p.splitIndex}-${Math.round(p.timeSeconds * 1000)}`,
          splitIndex: p.splitIndex,
          label: trackSplit?.name ?? `Split ${p.splitIndex}`,
          timeSeconds: p.timeSeconds,
          score: p.score,
          confidence: p.confidence,
        };
      });

      completeSplitDetectionJob(job.jobId, proposals);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === "CANCELLED") {
        cancelSplitDetectionJob(job.jobId);
        return;
      }
      failSplitDetectionJob(job.jobId, error.message ?? "Split detection failed");
    }
  })();
});
