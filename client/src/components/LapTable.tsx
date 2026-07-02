import { useCompare } from "../context/CompareContext";
import { useRouter } from "../lib/router";
import type { Lap, Session } from "../types";import { formatDeltaToBest, formatLapTime } from "../utils/time";

interface LapTableProps {
  session: Session;
  laps: Lap[];
}

export function LapTable({ session, laps }: LapTableProps) {
  const { navigate } = useRouter();
  const { toggleLap, isSelected } = useCompare();
  const bestMs = session.bestLapTimeMs;

  if (laps.length === 0) {
    return (
      <div className="empty-state">
        <p>No laps yet.</p>
        <p className="empty-state-sub">
          <button
            type="button"
            className="link-button"
            onClick={() => navigate(`/intake?session=${session.id}`)}
          >
            Open Intake
          </button>{" "}
          to add lap markers.
        </p>
      </div>
    );
  }
  return (
    <table className="lap-table">
      <thead>
        <tr>
          <th className="lap-table-check" aria-label="Select" />
          <th>Lap</th>
          <th>Time</th>
          <th>Δ best</th>
        </tr>
      </thead>
      <tbody>
        {laps.map((lap) => {
          const isBest = bestMs != null && lap.lapTimeMs === bestMs;
          const selected = isSelected(lap.id);

          return (
            <tr
              key={lap.id}
              className={`lap-row ${isBest ? "lap-row--best" : ""} ${selected ? "lap-row--selected" : ""}`}
              onClick={() => toggleLap(lap, session)}
            >
              <td className="lap-table-check" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleLap(lap, session)}
                  aria-label={`Select lap ${lap.lapNumber}`}
                />
              </td>
              <td>Lap {lap.lapNumber}</td>
              <td className="lap-time">{formatLapTime(lap.lapTimeMs)}</td>
              <td className="lap-delta">
                {bestMs != null ? formatDeltaToBest(lap.lapTimeMs, bestMs) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
