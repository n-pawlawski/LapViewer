import { formatVideoTime } from "../utils/time";
import type { SplitBankSummaryDto, SplitDetectionJobStatus } from "../api/splitDetection";

export interface LocalSplitProposal {
  id: string;
  splitIndex: number;
  label: string;
  time: number;
  score: number;
  confidence: number;
}

interface SplitDetectionPanelProps {
  status: SplitDetectionJobStatus | "idle";
  progress: number;
  proposals: LocalSplitProposal[];
  reviewIndex: number;
  bankSummary: SplitBankSummaryDto | null;
  missingSplitIndices: number[];
  selectedLapNumber: number | null;
  detecting: boolean;
  canSuggest: boolean;
  suggestDisabledReason: string | null;
  error?: string | null;
  onSelectIndex: (index: number) => void;
  onAccept: () => void;
  onReject: () => void;
  onCancelJob: () => void;
}

function statusLabel(status: SplitDetectionPanelProps["status"]): string {
  switch (status) {
    case "idle":
      return "Ready";
    case "queued":
      return "Queued…";
    case "running":
      return "Scanning lap…";
    case "done":
      return "Review suggestions";
    case "error":
      return "Error";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function SplitDetectionPanel({
  status,
  progress,
  proposals,
  reviewIndex,
  bankSummary,
  missingSplitIndices,
  selectedLapNumber,
  detecting,
  canSuggest,
  suggestDisabledReason,
  error,
  onSelectIndex,
  onAccept,
  onReject,
  onCancelJob,
}: SplitDetectionPanelProps) {
  const reviewing = proposals.length > 0;
  const current = reviewing ? proposals[reviewIndex] : undefined;
  const isRunning = status === "queued" || status === "running";

  return (
    <aside className="intake-detection-panel intake-detection-panel--embedded" aria-label="Split suggestions">

      <div className="intake-detection-status">
        <span className={`intake-detection-status-badge intake-detection-status-badge--${status}`}>
          {statusLabel(status)}
        </span>
        {selectedLapNumber != null && (
          <span className="field-hint">Lap {selectedLapNumber}</span>
        )}
      </div>

      {bankSummary && (
        <p className="field-hint split-bank-summary">
          Track reference pool: {bankSummary.totalEntries} image
          {bankSummary.totalEntries === 1 ? "" : "s"}
          {Object.keys(bankSummary.bySplitIndex).length > 0 && (
            <>
              {" "}
              (
              {Object.entries(bankSummary.bySplitIndex)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([idx, count]) => `S${idx}: ${count}`)
                .join(", ")}
              )
            </>
          )}
        </p>
      )}

      {!reviewing && !isRunning && !detecting && (
        <p className="intake-detection-idle-hint">
          {canSuggest ? (
            <>
              Missing splits on lap {selectedLapNumber}:{" "}
              {missingSplitIndices.map((i) => `Split ${i}`).join(", ")}. Run suggest splits, then
              use <kbd>←</kbd>/<kbd>→</kbd> to frame-step and <kbd>S</kbd> to accept each one.
            </>
          ) : (
            suggestDisabledReason ??
            "Select a lap with missing splits to suggest markers from the track reference pool."
          )}
        </p>
      )}

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
            {current.label} — suggestion {reviewIndex + 1} / {proposals.length}
          </p>
          <p className="intake-detection-current-time">{formatVideoTime(current.time)}</p>
          <p className="field-hint">
            Match {(current.confidence * 100).toFixed(0)}% · score {current.score.toFixed(3)}
          </p>
          <div className="intake-detection-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={onAccept}>
              Accept at playhead (S)
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onReject}>
              Skip (X)
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
                  <span className="intake-detection-list-time">{proposal.label}</span>
                  <span className="intake-detection-list-confidence">
                    {formatVideoTime(proposal.time)} · {(proposal.confidence * 100).toFixed(0)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="field-hint intake-detection-shortcuts">
            Review: <kbd>,</kbd>/<kbd>.</kbd> prev/next · <kbd>S</kbd> accept at playhead ·{" "}
            <kbd>X</kbd> skip · <kbd>←</kbd>/<kbd>→</kbd> frame step
          </p>
        </>
      )}
    </aside>
  );
}
