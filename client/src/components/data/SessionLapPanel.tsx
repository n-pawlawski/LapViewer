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
}

export function SessionLapPanel({
  session,
  detail,
  onOpenIntake,
  onEdit,
  onDelete,
}: SessionLapPanelProps) {
  return (
    <div className="session-lap-panel">
      <SessionSummaryStrip
        session={session}
        detail={detail}
        onOpenIntake={onOpenIntake}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <LapTable session={session} laps={detail.laps} sessionDetail={detail} />
    </div>
  );
}
