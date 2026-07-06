import { Router } from "express";
import {
  addDetectionBankEntry,
  getDetectionProfileByTrackId,
  getOrCreateDetectionProfile,
  listDetectionBankEntries,
  updateDetectionProfile,
} from "../services/detectionProfiles.js";
import {
  cancelDetectionJob,
  completeDetectionJob,
  createDetectionJob,
  failDetectionJob,
  getDetectionJob,
  getDetectionJobInternal,
  markDetectionJobRunning,
  updateDetectionJobProgress,
} from "../services/detectionJobs.js";
import { renderFramePng, runDetection, extractRoiGrayFromVideo } from "../services/lapDetection.js";
import { getSessionById, getSessionSourcePath } from "../services/sessions.js";
import { getTrackById, getTrackByName } from "../services/tracks.js";
import type { AddDetectionBankEntryBody, DetectionRoi, UpdateDetectionProfileBody } from "../types.js";

export const detectionRouter = Router();

function parseRoi(raw: string | undefined): DetectionRoi | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { x0: parts[0]!, y0: parts[1]!, x1: parts[2]!, y1: parts[3]! };
}

function lastLapStartAfterAnchor(
  markers: Array<{ timeSeconds: number; kind: string }>,
  anchorTime: number,
): number | undefined {
  const starts = markers
    .filter((m) => m.kind === "lapStart")
    .map((m) => m.timeSeconds)
    .filter((t) => t > anchorTime + 0.01)
    .sort((a, b) => a - b);
  return starts.length > 0 ? starts[starts.length - 1] : undefined;
}

detectionRouter.get("/detect-laps/:jobId", (req, res) => {
  const job = getDetectionJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Detection job not found" });
    return;
  }
  res.json(job);
});

detectionRouter.delete("/detect-laps/:jobId", (req, res) => {
  const cancelled = cancelDetectionJob(req.params.jobId);
  if (!cancelled) {
    const job = getDetectionJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "Detection job not found" });
      return;
    }
    res.status(409).json({ error: "Job cannot be cancelled", status: job.status });
    return;
  }
  res.json({ jobId: req.params.jobId, status: "cancelled" });
});

export const sessionDetectionRouter = Router({ mergeParams: true });

sessionDetectionRouter.post("/:id/detect-laps", (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const anchorTime = req.body?.anchorTime;
  if (typeof anchorTime !== "number" || anchorTime < 0) {
    res.status(400).json({ error: "anchorTime (seconds) is required" });
    return;
  }

  if (!session.track) {
    res.status(400).json({ error: "Session has no track; assign a track before detection" });
    return;
  }

  const track = getTrackByName(session.track);
  if (!track) {
    res.status(400).json({ error: `Track "${session.track}" not found in catalog` });
    return;
  }

  const profile = getDetectionProfileByTrackId(track.id);
  if (!profile?.roi) {
    res.status(400).json({ error: "Track detection profile has no ROI; calibrate first" });
    return;
  }

  const sourcePath = getSessionSourcePath(session.id);
  if (!sourcePath) {
    res.status(404).json({ error: "Session video not found" });
    return;
  }

  const bank = listDetectionBankEntries(profile.id);
  const finalMarkerTime = lastLapStartAfterAnchor(session.markers, anchorTime);
  const endTime =
    typeof req.body?.endTime === "number" ? req.body.endTime : session.durationSeconds ?? undefined;

  const job = createDetectionJob(session.id);
  res.status(202).json({ jobId: job.jobId });

  void (async () => {
    markDetectionJobRunning(job.jobId);
    try {
      const result = await runDetection({
        videoPath: sourcePath,
        sessionId: session.id,
        anchorTime,
        endTime: endTime ?? undefined,
        profile,
        bank,
        finalMarkerTime,
        onProgress: (p) => updateDetectionJobProgress(job.jobId, p),
        isCancelled: () => getDetectionJobInternal(job.jobId)?.cancelled === true,
      });
      completeDetectionJob(job.jobId, result);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === "CANCELLED") {
        cancelDetectionJob(job.jobId);
        return;
      }
      failDetectionJob(job.jobId, error.message ?? "Detection failed");
    }
  })();
});

sessionDetectionRouter.get("/:id/frame", async (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const timeSec = Number(req.query.t);
  if (!Number.isFinite(timeSec) || timeSec < 0) {
    res.status(400).json({ error: "Query param t (seconds) is required" });
    return;
  }

  const sourcePath = getSessionSourcePath(session.id);
  if (!sourcePath) {
    res.status(404).json({ error: "Session video not found" });
    return;
  }

  const roi = parseRoi(typeof req.query.roi === "string" ? req.query.roi : undefined);

  try {
    const png = await renderFramePng(sourcePath, timeSec, roi ?? undefined);
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message ?? "Frame extraction failed" });
  }
});

export const trackDetectionRouter = Router({ mergeParams: true });

trackDetectionRouter.get("/:trackId/detection-profile", (req, res) => {
  const track = getTrackById(req.params.trackId);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }
  const profile = getDetectionProfileByTrackId(track.id);
  if (!profile) {
    res.status(404).json({ error: "Detection profile not found" });
    return;
  }
  res.json(profile);
});

trackDetectionRouter.put("/:trackId/detection-profile", (req, res) => {
  const track = getTrackById(req.params.trackId);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  const body = req.body as UpdateDetectionProfileBody;
  try {
    const profile = getOrCreateDetectionProfile(track.id);
    const updated = updateDetectionProfile(profile.id, body);
    res.json(updated);
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    throw err;
  }
});

trackDetectionRouter.get("/:trackId/detection-profile/bank", (req, res) => {
  const track = getTrackById(req.params.trackId);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }
  const profile = getDetectionProfileByTrackId(track.id);
  if (!profile) {
    res.json([]);
    return;
  }
  const entries = listDetectionBankEntries(profile.id).map((entry) => ({
    ...entry,
    roiGray: undefined,
    roiGrayLength: entry.roiGray.length,
  }));
  res.json(entries);
});

trackDetectionRouter.post("/:trackId/detection-profile/bank", async (req, res) => {
  const track = getTrackById(req.params.trackId);
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  const body = req.body as AddDetectionBankEntryBody & {
    roiGray?: string | number[];
    extractFromSession?: boolean;
  };
  if (!body?.sourceSessionId || body.timeSeconds == null) {
    res.status(400).json({
      error: "sourceSessionId and timeSeconds are required",
    });
    return;
  }

  try {
    const profile = getOrCreateDetectionProfile(track.id);
    if (!profile.roi) {
      res.status(400).json({ error: "Detection profile has no ROI" });
      return;
    }

    let roiUsed = body.roiUsed ?? profile.roi;
    let roiGray: Buffer;

    if (body.extractFromSession) {
      const session = getSessionById(body.sourceSessionId);
      if (!session) {
        res.status(404).json({ error: "Source session not found" });
        return;
      }
      const sourcePath = getSessionSourcePath(body.sourceSessionId);
      if (!sourcePath) {
        res.status(404).json({ error: "Source session video not found" });
        return;
      }
      roiUsed = profile.roi;
      roiGray = await extractRoiGrayFromVideo(sourcePath, body.timeSeconds, profile.roi);
    } else {
      if (!body.roiUsed || !body.roiGray) {
        res.status(400).json({
          error: "roiUsed and roiGray are required unless extractFromSession is true",
        });
        return;
      }
      roiGray =
        typeof body.roiGray === "string"
          ? Buffer.from(body.roiGray, "base64")
          : Buffer.from(body.roiGray);
    }

    const entry = addDetectionBankEntry(profile.id, {
      sourceSessionId: body.sourceSessionId,
      timeSeconds: body.timeSeconds,
      roiUsed,
      roiGray,
    });
    res.status(201).json({
      ...entry,
      roiGray: undefined,
      roiGrayLength: entry.roiGray.length,
    });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "VALIDATION") {
      res.status(400).json({ error: error.message });
      return;
    }
    throw err;
  }
});
