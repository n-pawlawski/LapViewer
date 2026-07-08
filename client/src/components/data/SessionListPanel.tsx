import { SessionList } from "../SessionList";
import type { Session } from "../../types";
import type { SessionListScope } from "../../hooks/useDataPageState";

interface SessionListPanelProps {
  sessions: Session[];
  selectedId: string | null;
  scope: SessionListScope;
  onScopeChange: (scope: SessionListScope) => void;
  onSelect: (id: string) => void;
  ownerDisplayNames?: Record<string, string>;
  emptyMessage?: string;
}

export function SessionListPanel({
  sessions,
  selectedId,
  scope,
  onScopeChange,
  onSelect,
  ownerDisplayNames,
  emptyMessage = "No sessions match filters.",
}: SessionListPanelProps) {
  if (sessions.length === 0) {
    return (
      <div className="session-list-panel">
        <h2 className="pane-title">Sessions</h2>
        <div className="session-list-scope-tabs" role="tablist" aria-label="Session scope">
          <button
            type="button"
            role="tab"
            className={`session-scope-tab ${scope === "mine" ? "session-scope-tab--active" : ""}`}
            aria-selected={scope === "mine"}
            onClick={() => onScopeChange("mine")}
          >
            My sessions
          </button>
          <button
            type="button"
            role="tab"
            className={`session-scope-tab ${scope === "public" ? "session-scope-tab--active" : ""}`}
            aria-selected={scope === "public"}
            onClick={() => onScopeChange("public")}
          >
            Public sessions
          </button>
        </div>
        <div className="empty-state empty-state--compact">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <SessionList
      sessions={sessions}
      selectedId={selectedId}
      scope={scope}
      onScopeChange={onScopeChange}
      onSelect={onSelect}
      ownerDisplayNames={ownerDisplayNames}
    />
  );
}
