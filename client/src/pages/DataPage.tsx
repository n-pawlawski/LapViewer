import { useEffect, useState } from "react";
import {
  fetchSession,
  fetchSessions,
  type SessionDetail,
  type SessionSummary,
} from "../api/sessions";
import { AppShell, CompareTray } from "../components/AppShell";
import { LapTable } from "../components/LapTable";
import { SessionList } from "../components/SessionList";
import { useRouter, useSearchParams } from "../lib/router";
import { setSelectedSessionId } from "../lib/selectedSession";
import type { Session } from "../types";

function summaryToSession(summary: SessionSummary): Session {
  return {
    id: summary.id,
    title: summary.title,
    sourcePath: summary.sourcePath,
    status: summary.status,
    track: summary.track,
    date: summary.date,
    lapCount: summary.lapCount,
    bestLapTimeMs: summary.bestLapTimeMs,
    usesDemoStream: summary.status === "ready",
  };
}

function statusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing proxy";
    case "missing":
      return "Missing file";
    default:
      return status;
  }
}

export function DataPage() {
  const { navigate } = useRouter();
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSessions()
      .then((list) => {
        if (cancelled) return;
        setSessions(list);
        if (list.length > 0) {
          setSelectedId((prev) => {
            if (sessionFromUrl && list.some((s) => s.id === sessionFromUrl)) {
              return sessionFromUrl;
            }
            return prev ?? list[0].id;
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sessions");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionFromUrl]);

  useEffect(() => {
    setSelectedSessionId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    fetchSession(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load session");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const session = detail ? summaryToSession(detail) : null;

  return (
    <AppShell>
      <div className="data-page">
        {loading && <p className="data-status">Loading sessions…</p>}
        {error && <p className="data-status data-status--error">{error}</p>}

        {!loading && sessions.length === 0 && (
          <div className="empty-state">
            <p>No sessions added yet.</p>
            <p className="empty-state-sub">
              Register a GoPro video from your library drive.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate("/intake")}>
              Add session
            </button>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="data-panes">
            <aside className="data-pane-left">
              <SessionList
                sessions={sessions.map(summaryToSession)}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </aside>
            <section className="data-pane-right">
              {session && detail ? (
                <>
                  <div className="session-details">
                    <h2 className="session-details-title">{session.title}</h2>
                    <dl className="session-details-meta">
                      <div>
                        <dt>File</dt>
                        <dd>{detail.fileName}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>
                          <span className={`status-badge status-badge--${session.status}`}>
                            {statusLabel(session.status)}
                          </span>
                        </dd>
                      </div>
                      {session.track && (
                        <div>
                          <dt>Track</dt>
                          <dd>{session.track}</dd>
                        </div>
                      )}
                      {session.date && (
                        <div>
                          <dt>Date</dt>
                          <dd>{session.date}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Laps</dt>
                        <dd>{session.lapCount}</dd>
                      </div>
                    </dl>
                    <div className="session-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate(`/intake?session=${session.id}`)}
                      >
                        Open Intake
                      </button>
                    </div>
                  </div>
                  <LapTable session={session} laps={detail.laps} sessionDetail={detail} />
                  <CompareTray />
                </>
              ) : (
                <div className="empty-state">
                  <p>Select a session to view laps.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
