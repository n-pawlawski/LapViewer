import type { Session } from "../types";
import type { SessionListScope } from "../hooks/useDataPageState";
import { fileNameFromPath, statusLabel } from "../utils/sessionUtils";
import { formatLapTime } from "../utils/time";

interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  scope: SessionListScope;
  onScopeChange: (scope: SessionListScope) => void;
  onSelect: (id: string) => void;
  ownerDisplayNames?: Record<string, string>;
}

export function SessionList({
  sessions,
  selectedId,
  scope,
  onScopeChange,
  onSelect,
  ownerDisplayNames = {},
}: SessionListProps) {
  return (
    <div className="session-list">
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
      <ul className="session-list-items">
        {sessions.map((session) => {
          const fileName = session.sourcePath ? fileNameFromPath(session.sourcePath) : "";
          const ownerName = ownerDisplayNames[session.id];
          const sublineParts = [
            scope === "public" && ownerName ? ownerName : null,
            fileName || null,
            session.track,
            session.date,
          ].filter(Boolean);
          const subline = sublineParts.join(" · ");

          return (
            <li key={session.id}>
              <button
                type="button"
                className={`session-card session-card--compact ${selectedId === session.id ? "session-card--selected" : ""}`}
                onClick={() => onSelect(session.id)}
              >
                <span className="session-card-title">{session.title}</span>
                {subline && <span className="session-card-subline">{subline}</span>}
                <span className="session-card-meta">
                  <span className={`status-badge status-badge--${session.status}`}>
                    {statusLabel(session.status)}
                  </span>
                  <span>{session.lapCount} laps</span>
                  {session.bestLapTimeMs != null && (
                    <span className="session-card-best">
                      Best {formatLapTime(session.bestLapTimeMs)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
