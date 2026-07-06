import { useCompare } from "../../context/CompareContext";
import { useRouter } from "../../lib/router";
import { formatLapTime } from "../../utils/time";

export function CompareDock() {
  const {
    selectedLaps,
    removeLap,
    clearAll,
    canCompare,
    selectionHint,
    selectedLapIds,
  } = useCompare();
  const { navigate } = useRouter();

  const compareHint =
    selectedLapIds.length === 0
      ? "Select 2 laps to compare"
      : selectedLapIds.length === 1
        ? "Select 1 more lap"
        : null;

  function handleCompare() {
    if (!canCompare) return;
    navigate(`/compare?laps=${selectedLapIds.join(",")}`);
  }

  return (
    <div className="compare-dock">
      <div className="compare-dock-inner">
        <div className="compare-tray-header">
          <span className="compare-tray-label">Compare</span>
          {selectedLaps.length === 0 && (
            <span className="compare-tray-empty">No laps selected</span>
          )}
        </div>
        <div className="compare-tray-chips">
          {selectedLaps.map(({ lap, session }) => (
            <span key={lap.id} className="compare-chip">
              {session.title} · Lap {lap.lapNumber} · {formatLapTime(lap.lapTimeMs)}
              <button
                type="button"
                className="compare-chip-remove"
                onClick={() => removeLap(lap.id)}
                aria-label={`Remove lap ${lap.lapNumber}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="compare-tray-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canCompare}
            onClick={handleCompare}
          >
            Compare selected ({selectedLapIds.length})
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={selectedLapIds.length === 0}
            onClick={clearAll}
          >
            Clear all
          </button>
          {(compareHint || selectionHint) && (
            <span className="compare-tray-hint">{selectionHint ?? compareHint}</span>
          )}
        </div>
      </div>
    </div>
  );
}
