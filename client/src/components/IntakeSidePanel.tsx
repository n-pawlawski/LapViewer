import type { ReactNode } from "react";

export type IntakeSidePanelTab = "detect" | "laps" | "details";

interface IntakeSidePanelProps {
  activeTab: IntakeSidePanelTab;
  onTabChange: (tab: IntakeSidePanelTab) => void;
  proposalCount: number;
  lapCount: number;
  detect: ReactNode;
  laps: ReactNode;
  details: ReactNode;
}

export function IntakeSidePanel({
  activeTab,
  onTabChange,
  proposalCount,
  lapCount,
  detect,
  laps,
  details,
}: IntakeSidePanelProps) {
  return (
    <aside className="intake-side-panel" aria-label="Marking tools">
      <div className="intake-side-panel-tabs" role="tablist" aria-label="Marking panels">
        <button
          type="button"
          role="tab"
          id="intake-tab-detect"
          aria-selected={activeTab === "detect"}
          aria-controls="intake-panel-detect"
          className={`intake-side-panel-tab${activeTab === "detect" ? " is-active" : ""}`}
          onClick={() => onTabChange("detect")}
          title="Auto-detect laps"
        >
          Auto-detect
          {proposalCount > 0 && (
            <span className="intake-side-panel-badge">{proposalCount}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          id="intake-tab-laps"
          aria-selected={activeTab === "laps"}
          aria-controls="intake-panel-laps"
          className={`intake-side-panel-tab${activeTab === "laps" ? " is-active" : ""}`}
          onClick={() => onTabChange("laps")}
          title="Laps and splits"
        >
          Laps & splits
          {lapCount > 0 && <span className="intake-side-panel-badge">{lapCount}</span>}
        </button>
        <button
          type="button"
          role="tab"
          id="intake-tab-details"
          aria-selected={activeTab === "details"}
          aria-controls="intake-panel-details"
          className={`intake-side-panel-tab${activeTab === "details" ? " is-active" : ""}`}
          onClick={() => onTabChange("details")}
        >
          Details
        </button>
      </div>

      <div className="intake-side-panel-body">
        {activeTab === "detect" && (
          <div
            id="intake-panel-detect"
            role="tabpanel"
            aria-labelledby="intake-tab-detect"
            className="intake-side-panel-pane"
          >
            {detect}
          </div>
        )}
        {activeTab === "laps" && (
          <div
            id="intake-panel-laps"
            role="tabpanel"
            aria-labelledby="intake-tab-laps"
            className="intake-side-panel-pane"
          >
            {laps}
          </div>
        )}
        {activeTab === "details" && (
          <div
            id="intake-panel-details"
            role="tabpanel"
            aria-labelledby="intake-tab-details"
            className="intake-side-panel-pane"
          >
            {details}
          </div>
        )}
      </div>
    </aside>
  );
}
