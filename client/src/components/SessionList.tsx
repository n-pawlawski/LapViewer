import type { Session } from "../types";
import { formatLapTime } from "../utils/time";

interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function statusLabel(status: Session["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing proxy";
    case "missing":
      return "Missing file";
    case "error":
      return "Error";
  }
}

export function SessionList({ sessions, selectedId, onSelect }: SessionListProps) {
  return (
    <div className="session-list">
      <h2 className="pane-title">Sessions</h2>
      <ul className="session-list-items">
        {sessions.map((session) => (
          <li key={session.id}>
            <button
              type="button"
              className={`session-card ${selectedId === session.id ? "session-card--selected" : ""}`}
              onClick={() => onSelect(session.id)}
            >
              <span className="session-card-title">{session.title}</span>
              <span className="session-card-file">{session.sourcePath.split("\\").pop()}</span>
              <span className="session-card-meta">
                <span className={`status-badge status-badge--${session.status}`}>
                  {statusLabel(session.status)}
                </span>
                <span>{session.lapCount} laps</span>
                {session.bestLapTimeMs != null && (
                  <span>Best {formatLapTime(session.bestLapTimeMs)}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
