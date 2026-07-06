import { useEffect, useMemo, useState } from "react";
import { fetchAllLaps, fetchSession, type FlatLapRow, type SessionSummary } from "../../api/sessions";
import { useCompare } from "../../context/CompareContext";
import { filterAndSortSessions, type SessionFilterState } from "../../hooks/useSessionFilters";
import { summaryToSession } from "../../utils/sessionUtils";
import { formatDeltaToBest, formatLapTime } from "../../utils/time";

interface AllLapsPanelProps {
  sessions: SessionSummary[];
  filters: SessionFilterState;
}

function flatRowMatchesFilters(
  row: FlatLapRow,
  allowedSessionIds: Set<string>,
): boolean {
  return allowedSessionIds.has(row.sessionId);
}

export function AllLapsPanel({ sessions, filters }: AllLapsPanelProps) {
  const [laps, setLaps] = useState<FlatLapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toggleLap, isSelected } = useCompare();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAllLaps()
      .then((rows) => {
        if (!cancelled) setLaps(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load laps");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessions]);

  const allowedSessionIds = useMemo(() => {
    const filtered = filterAndSortSessions(sessions, filters);
    return new Set(filtered.map((s) => s.id));
  }, [sessions, filters]);

  const visibleLaps = useMemo(
    () => laps.filter((row) => flatRowMatchesFilters(row, allowedSessionIds)),
    [laps, allowedSessionIds],
  );

  const bestBySession = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of laps) {
      const cur = map.get(row.sessionId);
      if (cur == null || row.lapTimeMs < cur) {
        map.set(row.sessionId, row.lapTimeMs);
      }
    }
    return map;
  }, [laps]);

  async function handleToggle(row: FlatLapRow) {
    const detail = await fetchSession(row.sessionId);
    const lap = detail.laps.find((l) => l.id === row.id);
    if (!lap) return;
    const session = summaryToSession(detail);
    toggleLap(lap, session, detail);
  }

  if (loading) {
    return <p className="data-status">Loading laps…</p>;
  }

  if (error) {
    return <p className="data-status data-status--error">{error}</p>;
  }

  if (visibleLaps.length === 0) {
    return (
      <div className="empty-state empty-state--compact">
        <p>No laps marked yet.</p>
        <p className="empty-state-sub">Open Intake on a session to add lap markers.</p>
      </div>
    );
  }

  return (
    <table className="lap-table all-laps-table">
      <thead>
        <tr>
          <th className="lap-table-check" aria-label="Select" />
          <th>Session</th>
          <th>Lap</th>
          <th>Time</th>
          <th>Δ best</th>
        </tr>
      </thead>
      <tbody>
        {visibleLaps.map((row) => {
          const selected = isSelected(row.id);
          const bestMs = bestBySession.get(row.sessionId);

          return (
            <tr
              key={row.id}
              className={`lap-row ${row.isBestInSession ? "lap-row--best" : ""} ${selected ? "lap-row--selected" : ""}`}
              onClick={() => void handleToggle(row)}
            >
              <td className="lap-table-check" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => void handleToggle(row)}
                  aria-label={`Select ${row.sessionTitle} lap ${row.lapNumber}`}
                />
              </td>
              <td className="all-laps-session">{row.sessionTitle}</td>
              <td>Lap {row.lapNumber}</td>
              <td className="lap-time">{formatLapTime(row.lapTimeMs)}</td>
              <td className="lap-delta">
                {bestMs != null ? formatDeltaToBest(row.lapTimeMs, bestMs) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
