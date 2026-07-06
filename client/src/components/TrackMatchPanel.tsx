import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReferenceProfile } from "../api/referenceProfile";
import type { SessionDetail } from "../api/sessions";
import {
  acceptTrackMatchProposals,
  cancelReferenceBuildJob,
  cancelTrackMatchJob,
  fetchReferenceBuildJob,
  fetchTrackMatchJob,
  startReferenceBuild,
  startTrackMatch,
  type LowConfidenceRangeDto,
  type ProgressCurveSampleDto,
  type ProgressJobStatus,
  type TrackMatchProposalDto,
} from "../api/trackMatch";
import { formatVideoTime } from "../utils/time";

interface TrackMatchPanelProps {
  sessionId: string;
  trackId: string;
  profile: ReferenceProfile | null;
  durationSeconds: number;
  onProfileUpdated: (profile: ReferenceProfile) => void;
  onSessionUpdated: (session: SessionDetail) => void;
  onSeek: (timeSeconds: number) => void;
}

function statusLabel(status: ProgressJobStatus | "idle"): string {
  switch (status) {
    case "idle":
      return "Ready";
    case "queued":
      return "Queued…";
    case "running":
      return "Running…";
    case "done":
      return "Done";
    case "error":
      return "Error";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function ProgressGraph({
  samples,
  lowConfidenceRanges,
  durationSeconds,
}: {
  samples: ProgressCurveSampleDto[];
  lowConfidenceRanges: LowConfidenceRangeDto[];
  durationSeconds: number;
}) {
  if (samples.length < 2) return null;

  const width = 280;
  const height = 80;
  const maxTime = Math.max(durationSeconds, samples[samples.length - 1]?.timeSec ?? 1);

  const points = samples
    .map((s) => {
      const x = (s.timeSec / maxTime) * width;
      const y = height - s.estimatedProgress * height;
      return `${x},${y}`;
    })
    .join(" ");

  const lowRects = lowConfidenceRanges.map((range, index) => {
    const x0 = (range.startMs / 1000 / maxTime) * width;
    const x1 = (range.endMs / 1000 / maxTime) * width;
    return (
      <rect
        key={`${range.startMs}-${index}`}
        x={x0}
        y={0}
        width={Math.max(1, x1 - x0)}
        height={height}
        className="track-match-graph-low"
      />
    );
  });

  return (
    <div className="track-match-graph">
      <p className="field-hint">Progress curve (0 → 1 per lap)</p>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
        {lowRects}
        <polyline points={points} className="track-match-graph-line" />
      </svg>
    </div>
  );
}

export function TrackMatchPanel({
  sessionId,
  trackId,
  profile,
  durationSeconds,
  onProfileUpdated,
  onSessionUpdated,
  onSeek,
}: TrackMatchPanelProps) {
  const [buildJobId, setBuildJobId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<ProgressJobStatus | "idle">("idle");
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  const [matchJobId, setMatchJobId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<ProgressJobStatus | "idle">("idle");
  const [matchProgress, setMatchProgress] = useState(0);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [curveSamples, setCurveSamples] = useState<ProgressCurveSampleDto[]>([]);
  const [lowConfidenceRanges, setLowConfidenceRanges] = useState<LowConfidenceRangeDto[]>([]);
  const [proposals, setProposals] = useState<TrackMatchProposalDto[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [accepting, setAccepting] = useState(false);

  const pointCount = profile?.referencePointCount ?? 0;
  const hasPoints = pointCount > 0;
  const reviewing = proposals.length > 0;
  const current = reviewing ? proposals[Math.min(reviewIndex, proposals.length - 1)] : undefined;

  useEffect(() => {
    if (!buildJobId || !building) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const job = await fetchReferenceBuildJob(buildJobId);
        if (cancelled) return;
        setBuildStatus(job.status);
        setBuildProgress(job.progress);
        if (job.status === "done") {
          setBuilding(false);
          setBuildJobId(null);
          if (profile) {
            onProfileUpdated({ ...profile, referencePointCount: job.pointCount ?? pointCount });
          }
        } else if (job.status === "error" || job.status === "cancelled") {
          setBuilding(false);
          setBuildJobId(null);
          setBuildError(job.error ?? "Build failed");
        }
      } catch (err) {
        if (!cancelled) {
          setBuilding(false);
          setBuildError(err instanceof Error ? err.message : "Build poll failed");
        }
      }
    };
    const id = window.setInterval(() => void poll(), 800);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [buildJobId, building, onProfileUpdated, pointCount, profile]);

  useEffect(() => {
    if (!matchJobId || !matching) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const job = await fetchTrackMatchJob(matchJobId);
        if (cancelled) return;
        setMatchStatus(job.status);
        setMatchProgress(job.progress);
        if (job.curveSamples) setCurveSamples(job.curveSamples);
        if (job.lowConfidenceRanges) setLowConfidenceRanges(job.lowConfidenceRanges);
        if (job.status === "done") {
          setMatching(false);
          setProposals(job.proposals ?? []);
          setReviewIndex(0);
        } else if (job.status === "error" || job.status === "cancelled") {
          setMatching(false);
          setMatchJobId(null);
          setMatchError(job.error ?? "Match failed");
        }
      } catch (err) {
        if (!cancelled) {
          setMatching(false);
          setMatchError(err instanceof Error ? err.message : "Match poll failed");
        }
      }
    };
    const id = window.setInterval(() => void poll(), 800);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [matchJobId, matching]);

  const handleBuild = useCallback(async () => {
    if (!profile) return;
    setBuildError(null);
    setBuilding(true);
    setBuildStatus("queued");
    setBuildProgress(0);
    try {
      const { jobId } = await startReferenceBuild(trackId);
      setBuildJobId(jobId);
      setBuildStatus("running");
    } catch (err) {
      setBuilding(false);
      setBuildStatus("error");
      setBuildError(err instanceof Error ? err.message : "Could not start build");
    }
  }, [profile, trackId]);

  const handleCancelBuild = useCallback(async () => {
    if (!buildJobId) return;
    try {
      await cancelReferenceBuildJob(buildJobId);
    } catch {
      // Job may already be finished.
    }
    setBuildJobId(null);
    setBuilding(false);
    setBuildStatus("cancelled");
  }, [buildJobId]);

  const handleMatch = useCallback(async () => {
    if (!profile || !hasPoints) return;
    setMatchError(null);
    setProposals([]);
    setCurveSamples([]);
    setLowConfidenceRanges([]);
    setMatching(true);
    setMatchStatus("queued");
    setMatchProgress(0);
    try {
      const { jobId } = await startTrackMatch(
        sessionId,
        trackId,
        undefined,
        durationSeconds || undefined,
      );
      setMatchJobId(jobId);
      setMatchStatus("running");
    } catch (err) {
      setMatching(false);
      setMatchStatus("error");
      setMatchError(err instanceof Error ? err.message : "Could not start match");
    }
  }, [profile, hasPoints, sessionId, trackId, durationSeconds]);

  const handleCancelMatch = useCallback(async () => {
    if (!matchJobId) return;
    try {
      await cancelTrackMatchJob(matchJobId);
    } catch {
      // Job may already be finished.
    }
    setMatchJobId(null);
    setMatching(false);
    setMatchStatus("cancelled");
  }, [matchJobId]);

  const rejectCurrent = useCallback(() => {
    setProposals((prev) => {
      const next = prev.filter((_, i) => i !== reviewIndex);
      setReviewIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
  }, [reviewIndex]);

  const acceptCurrent = useCallback(async () => {
    if (!matchJobId || !current) return;
    setAccepting(true);
    try {
      const result = await acceptTrackMatchProposals(sessionId, matchJobId, [current.id]);
      onSessionUpdated(result.session);
      rejectCurrent();
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setAccepting(false);
    }
  }, [matchJobId, current, sessionId, onSessionUpdated, rejectCurrent]);

  const acceptAll = useCallback(async () => {
    if (!matchJobId || proposals.length === 0) return;
    setAccepting(true);
    try {
      const result = await acceptTrackMatchProposals(
        sessionId,
        matchJobId,
        proposals.map((p) => p.id),
      );
      onSessionUpdated(result.session);
      setProposals([]);
      setReviewIndex(0);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Accept all failed");
    } finally {
      setAccepting(false);
    }
  }, [matchJobId, proposals, sessionId, onSessionUpdated]);

  const lowWarning = useMemo(
    () => lowConfidenceRanges.length > 0 && !matching,
    [lowConfidenceRanges.length, matching],
  );

  if (!profile) {
    return (
      <p className="intake-empty-hint">
        Save a reference profile above before building visual fingerprints.
      </p>
    );
  }

  return (
    <div className="track-match-panel">
      <h3 className="track-match-panel-title">Track progress matching</h3>

      <p className="field-hint">
        Reference points: {hasPoints ? `${pointCount} fingerprints` : "not built yet"}
      </p>

      <div className="track-match-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void handleBuild()}
          disabled={building}
        >
          {building ? "Building…" : hasPoints ? "Rebuild points" : "Build reference points"}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => void handleMatch()}
          disabled={!hasPoints || matching}
        >
          {matching ? "Matching…" : "Match track"}
        </button>
      </div>

      {building && (
        <div className="track-match-job-status">
          <span className={`intake-detection-status-badge intake-detection-status-badge--${buildStatus}`}>
            Build: {statusLabel(buildStatus)}
          </span>
          <div className="intake-detection-progress">
            <div
              className="intake-detection-progress-bar"
              style={{ width: `${Math.round(buildProgress * 100)}%` }}
            />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleCancelBuild()}>
            Cancel build
          </button>
        </div>
      )}

      {matching && (
        <div className="track-match-job-status">
          <span className={`intake-detection-status-badge intake-detection-status-badge--${matchStatus}`}>
            Match: {statusLabel(matchStatus)}
          </span>
          <div className="intake-detection-progress">
            <div
              className="intake-detection-progress-bar"
              style={{ width: `${Math.round(matchProgress * 100)}%` }}
            />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleCancelMatch()}>
            Cancel match
          </button>
        </div>
      )}

      {buildError && <p className="data-status data-status--error">{buildError}</p>}
      {matchError && <p className="data-status data-status--error">{matchError}</p>}

      {curveSamples.length > 1 && (
        <ProgressGraph
          samples={curveSamples}
          lowConfidenceRanges={lowConfidenceRanges}
          durationSeconds={durationSeconds}
        />
      )}

      {lowWarning && (
        <p className="data-status data-status--warn">
          Low-confidence segments detected ({lowConfidenceRanges.length}) — review proposals carefully.
        </p>
      )}

      {reviewing && current && (
        <div className="track-match-review">
          <p className="field-hint track-match-proposal-summary">
            {proposals.length} proposals across{" "}
            {new Set(proposals.map((p) => p.lapNumber).filter((n) => n != null)).size} lap(s)
            {proposals[0]?.kind === "split" ? " (splits per marked lap)" : ""}
          </p>
          <p className="intake-detection-current-label">
            Proposal {reviewIndex + 1} / {proposals.length}
          </p>
          <p className="intake-detection-current-time">
            {current.kind === "lapStart"
              ? `Lap start (L${current.lapNumber ?? "?"})`
              : `Split ${current.splitIndex ?? "?"} (L${current.lapNumber ?? "?"})`}{" "}
            @ {formatVideoTime(current.timeSeconds)}
          </p>
          <p className="field-hint">Confidence {(current.confidence * 100).toFixed(0)}%</p>
          <div className="intake-detection-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void acceptCurrent()}
              disabled={accepting}
            >
              Accept (Y)
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={rejectCurrent}>
              Reject (X)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onSeek(current.timeSeconds)}
            >
              Seek
            </button>
          </div>
          <div className="track-match-review-nav">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={reviewIndex <= 0}
              onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={reviewIndex >= proposals.length - 1}
              onClick={() => setReviewIndex((i) => Math.min(proposals.length - 1, i + 1))}
            >
              Next →
            </button>
          </div>
          {proposals.length > 1 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm track-match-accept-all"
              onClick={() => void acceptAll()}
              disabled={accepting}
            >
              Accept all ({proposals.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
