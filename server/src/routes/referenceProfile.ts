import { Router } from "express";
import { requireUserPermission } from "../middleware/requirePermission.js";
import {
  getReferenceProfileByTrackId,
  saveReferenceProfile,
} from "../services/referenceProfiles.js";
import {
  cancelReferenceBuildJob,
  completeReferenceBuildJob,
  createReferenceBuildJob,
  failReferenceBuildJob,
  getReferenceBuildJobInternal,
  markReferenceBuildJobRunning,
  updateReferenceBuildJobProgress,
} from "../services/referenceBuildJobs.js";
import { getTrackById } from "../services/tracks.js";
import { resolveSessionMediaPath } from "../services/sessionMedia.js";
import { buildReferencePoints } from "../services/trackProgressVision.js";
import type { SaveReferenceProfileBody } from "../types.js";

export const trackReferenceRouter = Router({ mergeParams: true });

trackReferenceRouter.get("/:trackId/reference-profile", (req, res) => {
  const track = getTrackById(req.params.trackId, req.userId!);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }
  const profile = getReferenceProfileByTrackId(track.id);
  if (!profile) {
    res.status(404).json({ error: "No reference profile for this track" });
    return;
  }
  res.json(profile);
});

const requireTracksManage = requireUserPermission("tracks.manage");

trackReferenceRouter.put("/:trackId/reference-profile", requireTracksManage, (req, res) => {
  const body = req.body as SaveReferenceProfileBody;
  if (!body?.referenceSessionId || body.referenceLapNumber == null) {
    res.status(400).json({
      error: "referenceSessionId and referenceLapNumber are required",
    });
    return;
  }
  try {
    const profile = saveReferenceProfile(req.params.trackId, req.userId!, body);
    res.json(profile);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    throw err;
  }
});

trackReferenceRouter.post("/:trackId/reference-profile/build", requireTracksManage, (req, res) => {
  const track = getTrackById(req.params.trackId, req.userId!);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  const profile = getReferenceProfileByTrackId(track.id);
  if (!profile) {
    res.status(400).json({ error: "Save a reference profile before building points" });
    return;
  }

  const job = createReferenceBuildJob(track.id);
  res.status(202).json({ jobId: job.jobId });

  void (async () => {
    markReferenceBuildJobRunning(job.jobId);
    try {
      const sourcePath = await resolveSessionMediaPath(
        profile.referenceSessionId,
        req.userId!,
      );
      if (!sourcePath) {
        failReferenceBuildJob(job.jobId, "Reference session video not found");
        return;
      }

      const result = await buildReferencePoints(profile, sourcePath, {
        onProgress: (p) => updateReferenceBuildJobProgress(job.jobId, p),
        isCancelled: () => getReferenceBuildJobInternal(job.jobId)?.cancelled === true,
      });
      completeReferenceBuildJob(job.jobId, result.pointCount);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === "CANCELLED") {
        cancelReferenceBuildJob(job.jobId);
        return;
      }
      failReferenceBuildJob(job.jobId, error.message ?? "Reference build failed");
    }
  })();
});
