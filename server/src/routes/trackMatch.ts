import { Router } from "express";
import {
  cancelReferenceBuildJob,
  completeReferenceBuildJob,
  createReferenceBuildJob,
  failReferenceBuildJob,
  getReferenceBuildJob,
  getReferenceBuildJobInternal,
  markReferenceBuildJobRunning,
  updateReferenceBuildJobProgress,
} from "../services/referenceBuildJobs.js";
import {
  cancelTrackMatchJob,
  completeTrackMatchJob,
  createTrackMatchJob,
  failTrackMatchJob,
  getTrackMatchJob,
  getTrackMatchJobInternal,
  markTrackMatchJobRunning,
  updateTrackMatchJobProgress,
} from "../services/trackMatchJobs.js";
import { getReferenceProfileByTrackId } from "../services/referenceProfiles.js";
import { getSessionById, insertMarker } from "../services/sessions.js";
import { resolveSessionMediaPath } from "../services/sessionMedia.js";
import { getTrackById } from "../services/tracks.js";
import {
  buildReferencePoints,
  loadReferencePoints,
  runTrackMatch,
} from "../services/trackProgressVision.js";
import type { AcceptTrackMatchBody, StartTrackMatchBody } from "../types.js";

export const referenceBuildRouter = Router();

function buildJobOwnedByUser(jobId: string, userId: string): boolean {
  const job = getReferenceBuildJob(jobId);
  if (!job) return false;
  return getTrackById(job.trackId, userId) != null;
}

referenceBuildRouter.get("/:jobId", (req, res) => {
  if (!buildJobOwnedByUser(req.params.jobId, req.userId!)) {
    res.status(404).json({ error: "Reference build job not found" });
    return;
  }
  res.json(getReferenceBuildJob(req.params.jobId));
});

referenceBuildRouter.delete("/:jobId", (req, res) => {
  if (!buildJobOwnedByUser(req.params.jobId, req.userId!)) {
    res.status(404).json({ error: "Reference build job not found" });
    return;
  }
  const cancelled = cancelReferenceBuildJob(req.params.jobId);
  if (!cancelled) {
    const job = getReferenceBuildJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "Reference build job not found" });
      return;
    }
    res.status(409).json({ error: "Job cannot be cancelled", status: job.status });
    return;
  }
  res.json({ jobId: req.params.jobId, status: "cancelled" });
});

export const trackMatchRouter = Router();

function matchJobOwnedByUser(jobId: string, userId: string): boolean {
  const job = getTrackMatchJob(jobId);
  if (!job) return false;
  return getSessionById(job.sessionId, userId) != null;
}

trackMatchRouter.get("/:jobId", (req, res) => {
  if (!matchJobOwnedByUser(req.params.jobId, req.userId!)) {
    res.status(404).json({ error: "Track match job not found" });
    return;
  }
  res.json(getTrackMatchJob(req.params.jobId));
});

trackMatchRouter.delete("/:jobId", (req, res) => {
  if (!matchJobOwnedByUser(req.params.jobId, req.userId!)) {
    res.status(404).json({ error: "Track match job not found" });
    return;
  }
  const cancelled = cancelTrackMatchJob(req.params.jobId);
  if (!cancelled) {
    const job = getTrackMatchJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "Track match job not found" });
      return;
    }
    res.status(409).json({ error: "Job cannot be cancelled", status: job.status });
    return;
  }
  res.json({ jobId: req.params.jobId, status: "cancelled" });
});

export const sessionTrackMatchRouter = Router({ mergeParams: true });

sessionTrackMatchRouter.post("/:id/match-track", (req, res) => {
  const session = getSessionById(req.params.id, req.userId!);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const body = req.body as StartTrackMatchBody;
  if (!body?.trackId) {
    res.status(400).json({ error: "trackId is required" });
    return;
  }

  const track = getTrackById(body.trackId, req.userId!);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  if (!session.track || session.track !== track.name) {
    res.status(400).json({
      error: `Session track "${session.track ?? "none"}" does not match "${track.name}"`,
    });
    return;
  }

  const profile = getReferenceProfileByTrackId(track.id);
  if (!profile) {
    res.status(400).json({ error: "Track has no reference profile — save one first" });
    return;
  }

  if (profile.referencePointCount === 0) {
    res.status(400).json({
      error: "Reference points not built — run Build reference points first",
    });
    return;
  }

  const lapStartTimes = session.markers
    .filter((marker) => marker.kind === "lapStart")
    .map((marker) => marker.timeSeconds)
    .sort((a, b) => a - b);

  const scanStart =
    typeof body.scanStart === "number"
      ? body.scanStart
      : lapStartTimes[0] ?? 0;
  const scanEnd =
    typeof body.scanEnd === "number"
      ? body.scanEnd
      : session.durationSeconds ?? scanStart + 7200;

  const job = createTrackMatchJob(session.id, track.id);
  res.status(202).json({ jobId: job.jobId });

  void (async () => {
    markTrackMatchJobRunning(job.jobId);
    try {
      const sourcePath = await resolveSessionMediaPath(session.id, req.userId!);
      if (!sourcePath) {
        failTrackMatchJob(job.jobId, "Session video not found");
        return;
      }

      const refPoints = loadReferencePoints(profile.id);
      const result = await runTrackMatch(profile, sourcePath, scanStart, scanEnd, refPoints, {
        onProgress: (p) => updateTrackMatchJobProgress(job.jobId, p),
        isCancelled: () => getTrackMatchJobInternal(job.jobId)?.cancelled === true,
        lapStartTimes,
      });
      completeTrackMatchJob(job.jobId, result);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === "CANCELLED") {
        cancelTrackMatchJob(job.jobId);
        return;
      }
      failTrackMatchJob(job.jobId, error.message ?? "Track match failed");
    }
  })();
});

sessionTrackMatchRouter.post("/:id/match-track/:jobId/accept", (req, res) => {
  const session = getSessionById(req.params.id, req.userId!);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const job = getTrackMatchJob(req.params.jobId);
  if (!job || job.sessionId !== session.id) {
    res.status(404).json({ error: "Track match job not found" });
    return;
  }

  if (job.status !== "done" || !job.proposals?.length) {
    res.status(409).json({ error: "Job has no proposals to accept" });
    return;
  }

  const body = req.body as AcceptTrackMatchBody;
  const ids = body?.proposalIds;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "proposalIds array is required" });
    return;
  }

  const selected = job.proposals.filter((p) => ids.includes(p.id));
  if (selected.length === 0) {
    res.status(400).json({ error: "No matching proposals found" });
    return;
  }

  try {
    selected.sort((a, b) => a.timeSeconds - b.timeSeconds);
    for (const proposal of selected) {
      if (proposal.kind === "lapStart") {
        insertMarker(session.id, proposal.timeSeconds, { kind: "lapStart" }, req.userId!);
      } else {
        insertMarker(
          session.id,
          proposal.timeSeconds,
          {
            kind: "split",
            lapNumber: proposal.lapNumber,
            splitIndex: proposal.splitIndex,
          },
          req.userId!,
        );
      }
    }
    const updated = getSessionById(session.id, req.userId!);
    res.json({ session: updated, accepted: selected.length });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    throw err;
  }
});
