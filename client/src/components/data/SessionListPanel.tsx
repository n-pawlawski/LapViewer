import { SessionList } from "../SessionList";
import type { Session } from "../../types";

interface SessionListPanelProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyMessage?: string;
}

export function SessionListPanel({
  sessions,
  selectedId,
  onSelect,
  emptyMessage = "No sessions match filters.",
}: SessionListPanelProps) {
  if (sessions.length === 0) {
    return (
      <div className="session-list-panel">
        <h2 className="pane-title">Sessions</h2>
        <div className="empty-state empty-state--compact">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <SessionList sessions={sessions} selectedId={selectedId} onSelect={onSelect} />
  );
}
