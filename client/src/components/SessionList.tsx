import type { Session } from "../types";
import { fileNameFromPath, statusLabel } from "../utils/sessionUtils";
import { formatLapTime } from "../utils/time";

interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SessionList({ sessions, selectedId, onSelect }: SessionListProps) {
  return (
    <div className="session-list">
      <h2 className="pane-title">Sessions</h2>
      <ul className="session-list-items">
        {sessions.map((session) => {
          const fileName = fileNameFromPath(session.sourcePath);
          const subline = [fileName, session.track, session.date].filter(Boolean).join(" · ");

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
