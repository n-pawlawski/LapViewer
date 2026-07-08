import { useState } from "react";
import { updateSession, type SessionDetail } from "../../api/sessions";
import type { Session } from "../../types";
import { statusLabel } from "../../utils/sessionUtils";

interface SessionSummaryStripProps {
  session: Session;
  detail: SessionDetail;
  onOpenIntake: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVisibilityChange: () => void;
  canDelete?: boolean;
}

function canMakePublic(detail: SessionDetail): boolean {
  return detail.storageKind === "s3" && detail.uploadStatus === "complete";
}

export function SessionSummaryStrip({
  session,
  detail,
  onOpenIntake,
  onEdit,
  onDelete,
  onVisibilityChange,
  canDelete = false,
}: SessionSummaryStripProps) {
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const isOwner = detail.isOwner !== false;
  const isPublic = detail.isPublic === true;
  const shareable = canMakePublic(detail);

  async function handleVisibilityToggle() {
    if (!isOwner || !shareable || visibilityBusy) return;
    setVisibilityBusy(true);
    try {
      await updateSession(detail.id, { isPublic: !isPublic });
      onVisibilityChange();
    } catch (err) {
      console.error(err);
    } finally {
      setVisibilityBusy(false);
    }
  }

  return (
    <div className="session-summary-strip">
      <div className="session-summary-strip-main">
        <h2 className="session-summary-strip-title">{session.title}</h2>
        <span className="session-summary-strip-meta">
          {detail.fileName}
          {session.track ? ` · ${session.track}` : ""}
          {session.date ? ` · ${session.date}` : ""}
          {!isOwner && detail.ownerDisplayName ? ` · ${detail.ownerDisplayName}` : ""}
        </span>
        <span className={`status-badge status-badge--${session.status}`}>
          {statusLabel(session.status)}
        </span>
        {isPublic && <span className="status-badge status-badge--public">Public</span>}
        <span className="session-summary-strip-laps">{session.lapCount} laps</span>
      </div>
      <div className="session-summary-strip-actions">
        {isOwner ? (
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenIntake}>
              Open Intake
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
              Edit
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isPublic ? "btn-secondary" : "btn-primary"}`}
              disabled={!shareable || visibilityBusy}
              title={
                shareable
                  ? isPublic
                    ? "Stop sharing this session with other accounts"
                    : "Share this session with other accounts"
                  : "Only uploaded videos can be shared"
              }
              onClick={() => void handleVisibilityToggle()}
            >
              {visibilityBusy ? "Saving…" : isPublic ? "Make private" : "Make public"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled
              title="Relink file — coming soon"
            >
              Relink
            </button>
            {canDelete && (
              <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
                Delete
              </button>
            )}
          </>
        ) : (
          <span className="session-summary-strip-readonly">Shared by {detail.ownerDisplayName}</span>
        )}
      </div>
    </div>
  );
}
