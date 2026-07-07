import { formatVideoTime } from "../utils/time";
import type { SplitBankSummaryDto, SplitDetectionJobStatus } from "../api/splitDetection";
import type { LapMissingSplits } from "../utils/splitDetection";

export interface LocalSplitProposal {
  id: string;
  lapNumber: number;
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
  lapsWithMissing: LapMissingSplits[];
  selectedSuggestLaps: number[];
  batchLabel: string | null;
  detecting: boolean;
  canSuggest: boolean;
  canSuggestSelected: boolean;
  suggestDisabledReason: string | null;
  suggestSelectedDisabledReason: string | null;
  error?: string | null;
  onToggleSuggestLap: (lapNumber: number) => void;
  onSelectAllSuggestLaps: () => void;
  onClearSuggestLaps: () => void;
  onSuggestSelected: () => void;
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
      return "Scanning…";
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

function formatMissingSplits(indices: number[]): string {
  return indices.map((i) => `S${i}`).join(", ");
}

export function SplitDetectionPanel({
  status,
  progress,
  proposals,
  reviewIndex,
  bankSummary,
  missingSplitIndices,
  selectedLapNumber,
  lapsWithMissing,
  selectedSuggestLaps,
  batchLabel,
  detecting,
  canSuggest,
  canSuggestSelected,
  suggestDisabledReason,
  suggestSelectedDisabledReason,
  error,
  onToggleSuggestLap,
  onSelectAllSuggestLaps,
  onClearSuggestLaps,
  onSuggestSelected,
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
        {batchLabel && <span className="field-hint">{batchLabel}</span>}
        {!batchLabel && selectedLapNumber != null && (
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

      {!reviewing && !isRunning && !detecting && lapsWithMissing.length > 0 && (
        <div className="intake-detection-lap-picker">
          <div className="intake-detection-lap-picker-header">
            <span className="intake-detection-lap-picker-title">Laps with missing splits</span>
            <div className="intake-detection-lap-picker-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onSelectAllSuggestLaps}>
                All
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClearSuggestLaps}>
                None
              </button>
            </div>
          </div>
          <ul className="intake-detection-lap-list">
            {lapsWithMissing.map(({ lapNumber, missingSplitIndices: missing }) => {
              const checked = selectedSuggestLaps.includes(lapNumber);
              return (
                <li key={lapNumber}>
                  <label className="intake-detection-lap-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSuggestLap(lapNumber)}
                    />
                    <span className="intake-detection-lap-option-label">
                      Lap {lapNumber}
                      <span className="intake-detection-lap-option-missing">
                        {formatMissingSplits(missing)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn btn-auto-detect btn-sm intake-detection-suggest-selected"
            disabled={!canSuggestSelected}
            title={canSuggestSelected ? undefined : (suggestSelectedDisabledReason ?? undefined)}
            onClick={onSuggestSelected}
          >
            Suggest for selected laps
            {selectedSuggestLaps.length > 0 ? ` (${selectedSuggestLaps.length})` : ""}
          </button>
        </div>
      )}

      {!reviewing && !isRunning && !detecting && (
        <p className="intake-detection-idle-hint">
          {canSuggest ? (
            <>
              Missing splits on lap {selectedLapNumber}:{" "}
              {missingSplitIndices.map((i) => `Split ${i}`).join(", ")}. Use{" "}
              <strong>Suggest splits</strong> in the transport bar for the active lap, or select laps
              above to scan several at once. Review with <kbd>←</kbd>/<kbd>→</kbd> and accept with{" "}
              <kbd>S</kbd>.
            </>
          ) : lapsWithMissing.length === 0 ? (
            suggestDisabledReason ??
            "No laps with missing splits that can be suggested from the reference pool."
          ) : (
            suggestSelectedDisabledReason ??
            "Select one or more laps above, then run suggest for selected laps."
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
            Lap {current.lapNumber} · {current.label} — suggestion {reviewIndex + 1} / {proposals.length}
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
                  <span className="intake-detection-list-time">
                    L{proposal.lapNumber} · {proposal.label}
                  </span>
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
