import { useState } from "react";
import type { SessionDetail } from "../../api/sessions";
import type { Session } from "../../types";
import type { SessionListScope } from "../../hooks/useDataPageState";
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
  scope: SessionListScope;
  lapCount: number;
  totalLapCount: number;
  onOpenIntake: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVisibilityChange: () => void;
  canDelete?: boolean;
}

export function SessionWorkspace({
  session,
  detail,
  sessions,
  filters,
  scope,
  lapCount,
  totalLapCount,
  onOpenIntake,
  onEdit,
  onDelete,
  onVisibilityChange,
  canDelete = false,
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
        {scope === "mine" && (
          <button
            type="button"
            role="tab"
            className={`workspace-tab ${tab === "allLaps" ? "workspace-tab--active" : ""}`}
            aria-selected={tab === "allLaps"}
            onClick={() => setTab("allLaps")}
          >
            All laps ({totalLapCount})
          </button>
        )}
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
              onVisibilityChange={onVisibilityChange}
              canDelete={canDelete}
            />
          ) : (
            <div className="empty-state empty-state--compact">
              <p>
                {scope === "public"
                  ? "Select a public session to view laps."
                  : "Select a session to view laps."}
              </p>
            </div>
          )
        ) : (
          <AllLapsPanel sessions={sessions} filters={filters} />
        )}
      </div>
    </div>
  );
}
