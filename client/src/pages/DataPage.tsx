import { useMemo, useState } from "react";
import { deleteSession } from "../api/sessions";
import { AppShell } from "../components/AppShell";
import { CompareDock } from "../components/data/CompareDock";
import { DataToolbar } from "../components/data/DataToolbar";
import { SessionEditModal } from "../components/data/SessionEditModal";
import { SessionListPanel } from "../components/data/SessionListPanel";
import { SessionWorkspace } from "../components/data/SessionWorkspace";
import { useDataPageState } from "../hooks/useDataPageState";
import { useSessionFilters } from "../hooks/useSessionFilters";
import { useRouter, useSearchParams } from "../lib/router";
import { summaryToSession } from "../utils/sessionUtils";

export function DataPage() {
  const { navigate } = useRouter();
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");
  const [editOpen, setEditOpen] = useState(false);

  const {
    sessions,
    selectedId,
    setSelectedId,
    detail,
    loading,
    error,
    refreshDetail,
    removeSessionFromList,
  } = useDataPageState(sessionFromUrl);

  const {
    filters,
    setFilters,
    trackOptions,
    filteredSessions,
    hasActiveFilters,
    clearFilters,
  } = useSessionFilters(sessions);

  const filteredAsSessions = useMemo(
    () => filteredSessions.map(summaryToSession),
    [filteredSessions],
  );

  const session = detail ? summaryToSession(detail) : null;
  const totalLapCount = useMemo(
    () => sessions.reduce((sum, s) => sum + s.lapCount, 0),
    [sessions],
  );

  function handleOpenIntake() {
    if (!session) return;
    navigate(`/intake?session=${session.id}`);
  }

  function handleDeleteFromStrip() {
    if (!detail) return;
    if (!window.confirm(`Remove "${detail.title}" from DeltaView? Lap markers will be deleted.`)) {
      return;
    }
    void deleteSession(detail.id)
      .then(() => removeSessionFromList(detail.id))
      .catch((err) => {
        console.error(err);
      });
  }

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

        {!loading && sessions.length > 0 && (
          <>
            <DataToolbar
              filters={filters}
              trackOptions={trackOptions}
              sessionCount={sessions.length}
              filteredCount={filteredSessions.length}
              hasActiveFilters={hasActiveFilters}
              onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
              onTrackChange={(track) => setFilters((f) => ({ ...f, track }))}
              onStatusChange={(status) => setFilters((f) => ({ ...f, status }))}
              onSortChange={(sort) => setFilters((f) => ({ ...f, sort }))}
              onClearFilters={clearFilters}
            />
            <div className="data-panes">
              <aside className="data-pane-left">
                <SessionListPanel
                  sessions={filteredAsSessions}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  emptyMessage={
                    hasActiveFilters
                      ? "No sessions match filters."
                      : "No sessions yet."
                  }
                />
              </aside>
              <section className="data-pane-right">
                <SessionWorkspace
                  session={session}
                  detail={detail}
                  sessions={sessions}
                  filters={filters}
                  lapCount={session?.lapCount ?? 0}
                  totalLapCount={totalLapCount}
                  onOpenIntake={handleOpenIntake}
                  onEdit={() => setEditOpen(true)}
                  onDelete={handleDeleteFromStrip}
                />
              </section>
            </div>
            <CompareDock />
          </>
        )}

        {session && detail && editOpen && (
          <SessionEditModal
            key={detail.id}
            open={editOpen}
            sessionId={detail.id}
            title={detail.title}
            track={detail.track ?? ""}
            date={detail.date ?? ""}
            notes={detail.notes ?? ""}
            onClose={() => setEditOpen(false)}
            onSaved={() => void refreshDetail()}
            onDeleted={() => removeSessionFromList(detail.id)}
          />
        )}
      </div>
    </AppShell>
  );
}
