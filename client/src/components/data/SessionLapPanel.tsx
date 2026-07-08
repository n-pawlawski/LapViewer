import { LapTable } from "../LapTable";
import type { SessionDetail } from "../../api/sessions";
import type { Session } from "../../types";
import { SessionSummaryStrip } from "./SessionSummaryStrip";

interface SessionLapPanelProps {
  session: Session;
  detail: SessionDetail;
  onOpenIntake: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVisibilityChange: () => void;
  canDelete?: boolean;
}

export function SessionLapPanel({
  session,
  detail,
  onOpenIntake,
  onEdit,
  onDelete,
  onVisibilityChange,
  canDelete = false,
}: SessionLapPanelProps) {
  const isOwner = detail.isOwner !== false;

  return (
    <div className="session-lap-panel">
      <SessionSummaryStrip
        session={session}
        detail={detail}
        onOpenIntake={onOpenIntake}
        onEdit={onEdit}
        onDelete={onDelete}
        onVisibilityChange={onVisibilityChange}
        canDelete={canDelete}
      />
      <LapTable
        session={session}
        laps={detail.laps}
        sessionDetail={detail}
        readOnly={!isOwner}
      />
    </div>
  );
}
