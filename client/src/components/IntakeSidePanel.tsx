import type { ReactNode } from "react";

export type IntakeSidePanelTab = "suggest" | "laps" | "session";

interface IntakeSidePanelProps {
  activeTab: IntakeSidePanelTab;
  onTabChange: (tab: IntakeSidePanelTab) => void;
  proposalCount: number;
  lapCount: number;
  suggest: ReactNode;
  laps: ReactNode;
  session: ReactNode;
}

export function IntakeSidePanel({
  activeTab,
  onTabChange,
  proposalCount,
  lapCount,
  suggest,
  laps,
  session,
}: IntakeSidePanelProps) {
  return (
    <aside className="intake-side-panel" aria-label="Marking tools">
      <div className="intake-side-panel-tabs" role="tablist" aria-label="Marking panels">
        <button
          type="button"
          role="tab"
          id="intake-tab-suggest"
          aria-selected={activeTab === "suggest"}
          aria-controls="intake-panel-suggest"
          className={`intake-side-panel-tab${activeTab === "suggest" ? " is-active" : ""}`}
          onClick={() => onTabChange("suggest")}
          title="Suggest split markers from track reference pool"
        >
          Suggest splits
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
          id="intake-tab-session"
          aria-selected={activeTab === "session"}
          aria-controls="intake-panel-session"
          className={`intake-side-panel-tab${activeTab === "session" ? " is-active" : ""}`}
          onClick={() => onTabChange("session")}
          title="Session metadata"
        >
          Session
        </button>
      </div>

      <div className="intake-side-panel-body">
        {activeTab === "suggest" && (
          <div
            id="intake-panel-suggest"
            role="tabpanel"
            aria-labelledby="intake-tab-suggest"
            className="intake-side-panel-pane"
          >
            {suggest}
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
        {activeTab === "session" && (
          <div
            id="intake-panel-session"
            role="tabpanel"
            aria-labelledby="intake-tab-session"
            className="intake-side-panel-pane"
          >
            {session}
          </div>
        )}
      </div>
    </aside>
  );
}
