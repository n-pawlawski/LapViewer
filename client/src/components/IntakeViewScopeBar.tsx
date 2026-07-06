import type { IntakeLapScope, IntakeViewMode } from "../utils/intakeViewScope";

interface IntakeViewScopeBarProps {
  viewMode: IntakeViewMode;
  onViewModeChange: (mode: IntakeViewMode) => void;
  lapScope: IntakeLapScope;
  onLapScopeChange: (scope: IntakeLapScope) => void;
  lapCount: number;
  hasLapMarkers: boolean;
}

function ScopeOption({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`intake-view-scope-option${active ? " is-active" : ""}`}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function IntakeViewScopeBar({
  viewMode,
  onViewModeChange,
  lapScope,
  onLapScopeChange,
  lapCount,
  hasLapMarkers,
}: IntakeViewScopeBarProps) {
  const showLapScope = viewMode === "only-laps" && hasLapMarkers;

  return (
    <div className="intake-view-scope" aria-label="Video view scope">
      <span className="intake-view-scope-label">View</span>
      <div className="intake-view-scope-controls">
        <div className="intake-view-scope-group" role="group" aria-label="Race scope">
          <ScopeOption
            active={viewMode === "full-race"}
            label="Full race"
            onClick={() => onViewModeChange("full-race")}
          />
          <ScopeOption
            active={viewMode === "only-laps"}
            disabled={!hasLapMarkers}
            label="Only laps"
            onClick={() => onViewModeChange("only-laps")}
          />
        </div>

        {showLapScope && (
          <>
            <span className="intake-view-scope-divider" aria-hidden="true" />
            <div
              className="intake-view-scope-group intake-view-scope-group--scroll"
              role="group"
              aria-label="Lap scope"
            >
              <ScopeOption
                active={lapScope === "all"}
                label="All laps"
                onClick={() => onLapScopeChange("all")}
              />
              {Array.from({ length: lapCount }, (_, index) => {
                const lapNumber = index + 1;
                return (
                  <ScopeOption
                    key={lapNumber}
                    active={lapScope === lapNumber}
                    label={`Lap ${lapNumber}`}
                    onClick={() => onLapScopeChange(lapNumber)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
