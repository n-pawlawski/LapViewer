import { useState } from "react";
import type { SessionDetail } from "../../api/sessions";
import type { Session } from "../../types";
import { AllLapsPanel } from "./AllLapsPanel";
import { SessionLapPanel } from "./SessionLapPanel";
import type { SessionFilterState } from "../../hooks/useSessionFilters";
import type { SessionSummary } from "../../api/sessions";

type WorkspaceTab = "session" | "allLaps";

interface SessionWorkspaceProps {
  session: Session | null;
  detail: SessionDetail | null;
  sessions: SessionSummary[];
  filters: SessionFilterState;
  lapCount: number;
  totalLapCount: number;
  onOpenIntake: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SessionWorkspace({
  session,
  detail,
  sessions,
  filters,
  lapCount,
  totalLapCount,
  onOpenIntake,
  onEdit,
  onDelete,
}: SessionWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>("session");

  return (
    <div className="session-workspace">
      <div className="session-workspace-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`workspace-tab ${tab === "session" ? "workspace-tab--active" : ""}`}
          aria-selected={tab === "session"}
          onClick={() => setTab("session")}
        >
          This session{session ? ` (${lapCount})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          className={`workspace-tab ${tab === "allLaps" ? "workspace-tab--active" : ""}`}
          aria-selected={tab === "allLaps"}
          onClick={() => setTab("allLaps")}
        >
          All laps ({totalLapCount})
        </button>
      </div>
      <div className="session-workspace-content">
        {tab === "session" ? (
          session && detail ? (
            <SessionLapPanel
              session={session}
              detail={detail}
              onOpenIntake={onOpenIntake}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            <div className="empty-state empty-state--compact">
              <p>Select a session to view laps.</p>
            </div>
          )
        ) : (
          <AllLapsPanel sessions={sessions} filters={filters} />
        )}
      </div>
    </div>
  );
}
