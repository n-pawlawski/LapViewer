import type { SessionDetail } from "../../api/sessions";
import type { Session } from "../../types";
import { statusLabel } from "../../utils/sessionUtils";

interface SessionSummaryStripProps {
  session: Session;
  detail: SessionDetail;
  onOpenIntake: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SessionSummaryStrip({
  session,
  detail,
  onOpenIntake,
  onEdit,
  onDelete,
}: SessionSummaryStripProps) {
  return (
    <div className="session-summary-strip">
      <div className="session-summary-strip-main">
        <h2 className="session-summary-strip-title">{session.title}</h2>
        <span className="session-summary-strip-meta">
          {detail.fileName}
          {session.track ? ` · ${session.track}` : ""}
          {session.date ? ` · ${session.date}` : ""}
        </span>
        <span className={`status-badge status-badge--${session.status}`}>
          {statusLabel(session.status)}
        </span>
        <span className="session-summary-strip-laps">{session.lapCount} laps</span>
      </div>
      <div className="session-summary-strip-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenIntake}>
          Open Intake
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled
          title="Relink file — coming soon"
        >
          Relink
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
