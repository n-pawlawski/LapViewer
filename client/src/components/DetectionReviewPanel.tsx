import { formatVideoTime } from "../utils/time";
import type { DetectionJobStatus } from "../api/detection";

export interface LocalProposal {
  id: string;
  time: number;
  score: number;
  confidence: number;
}

interface DetectionReviewPanelProps {
  status: DetectionJobStatus | "idle";
  progress: number;
  proposals: LocalProposal[];
  reviewIndex: number;
  lapTimeMs?: number;
  error?: string | null;
  onSelectIndex: (index: number) => void;
  onAccept: () => void;
  onReject: () => void;
  onCancelJob: () => void;
}

function statusLabel(status: DetectionReviewPanelProps["status"]): string {
  switch (status) {
    case "idle":
      return "Ready";
    case "queued":
      return "Queued…";
    case "running":
      return "Scanning…";
    case "done":
      return "Review proposals";
    case "error":
      return "Error";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function DetectionReviewPanel({
  status,
  progress,
  proposals,
  reviewIndex,
  lapTimeMs,
  error,
  onSelectIndex,
  onAccept,
  onReject,
  onCancelJob,
}: DetectionReviewPanelProps) {
  const reviewing = proposals.length > 0;
  const current = reviewing ? proposals[reviewIndex] : undefined;
  const isRunning = status === "queued" || status === "running";

  return (
    <aside className="intake-detection-panel intake-detection-panel--embedded" aria-label="Lap detection">

      <div className="intake-detection-status">
        <span className={`intake-detection-status-badge intake-detection-status-badge--${status}`}>
          {statusLabel(status)}
        </span>
        {lapTimeMs != null && status === "done" && (
          <span className="field-hint">Est. lap {formatVideoTime(lapTimeMs / 1000)}</span>
        )}
      </div>

      {isRunning && (
        <div className="intake-detection-progress">
          <div
            className="intake-detection-progress-bar"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
          <span className="intake-detection-progress-label">{Math.round(progress * 100)}%</span>
        </div>
      )}

      {isRunning && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelJob}>
          Cancel scan
        </button>
      )}

      {error && <p className="data-status data-status--error">{error}</p>}

      {reviewing && current && (
        <div className="intake-detection-current">
          <p className="intake-detection-current-label">
            Proposal {reviewIndex + 1} / {proposals.length}
          </p>
          <p className="intake-detection-current-time">{formatVideoTime(current.time)}</p>
          <p className="field-hint">
            Confidence {(current.confidence * 100).toFixed(0)}% · score {current.score.toFixed(3)}
          </p>
          <div className="intake-detection-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={onAccept}>
              Accept (Y)
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onReject}>
              Reject (X)
            </button>
          </div>
        </div>
      )}

      {reviewing && (
        <>
          <ul className="intake-detection-list">
            {proposals.map((proposal, index) => (
              <li key={proposal.id}>
                <button
                  type="button"
                  className={`intake-detection-list-item ${
                    index === reviewIndex ? "intake-detection-list-item--active" : ""
                  }`}
                  onClick={() => onSelectIndex(index)}
                >
                  <span className="intake-detection-list-time">
                    {formatVideoTime(proposal.time)}
                  </span>
                  <span className="intake-detection-list-confidence">
                    {(proposal.confidence * 100).toFixed(0)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="field-hint intake-detection-shortcuts">
            Review: <kbd>,</kbd>/<kbd>.</kbd> prev/next · <kbd>Y</kbd> accept · <kbd>X</kbd> reject
            · <kbd>[</kbd>/<kbd>]</kbd> nudge frame
          </p>
        </>
      )}

      {!reviewing && !isRunning && status !== "error" && (
        <p className="intake-detection-idle-hint">
          Place a start anchor and calibrate ROI, then run auto-detect to propose lap starts.
        </p>
      )}
    </aside>
  );
}
