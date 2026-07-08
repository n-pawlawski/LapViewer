import { useMemo, useState } from "react";
import { deleteSession } from "../api/sessions";
import { AppShell } from "../components/AppShell";
import { CompareDock } from "../components/data/CompareDock";
import { DataToolbar } from "../components/data/DataToolbar";
import { SessionEditModal } from "../components/data/SessionEditModal";
import { SessionListPanel } from "../components/data/SessionListPanel";
import { SessionWorkspace } from "../components/data/SessionWorkspace";
import { useAuth } from "../context/AuthContext";
import { useDataPageState } from "../hooks/useDataPageState";
import { useSessionFilters } from "../hooks/useSessionFilters";
import { hasPermission } from "../lib/permissions";
import { useRouter, useSearchParams } from "../lib/router";
import { summaryToSession } from "../utils/sessionUtils";

export function DataPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");
  const [editOpen, setEditOpen] = useState(false);

  const {
    scope,
    setScope,
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

  const ownerDisplayNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const session of filteredSessions) {
      if (session.ownerDisplayName) {
        map[session.id] = session.ownerDisplayName;
      }
    }
    return map;
  }, [filteredSessions]);

  const session = detail ? summaryToSession(detail) : null;
  const totalLapCount = useMemo(
    () => sessions.reduce((sum, s) => sum + s.lapCount, 0),
    [sessions],
  );

  const emptyMessage =
    scope === "public"
      ? hasActiveFilters
        ? "No public sessions match filters."
        : "No public sessions yet."
      : hasActiveFilters
        ? "No sessions match filters."
        : "No sessions yet.";

  const canDeleteSessions = hasPermission(user, "sessions.delete");

  function handleOpenIntake() {
    if (!session || detail?.isOwner === false) return;
    navigate(`/intake?session=${session.id}`);
  }

  function handleDeleteFromStrip() {
    if (!detail || detail.isOwner === false || !canDeleteSessions) return;
    if (!window.confirm(`Remove "${detail.title}" from DeltaView? Lap markers will be deleted.`)) {
      return;
    }
    void deleteSession(detail.id)
      .then(() => removeSessionFromList(detail.id))
      .catch((err) => {
        console.error(err);
      });
  }

  const showEmptyLanding = !loading && scope === "mine" && sessions.length === 0;
  const showPanes = !loading && (sessions.length > 0 || scope === "public");

  return (
    <AppShell>
      <div className="data-page">
        {loading && <p className="data-status">Loading sessions…</p>}
        {error && <p className="data-status data-status--error">{error}</p>}

        {showEmptyLanding && (
          <div className="empty-state">
            <p>No sessions added yet.</p>
            <p className="empty-state-sub">
              Upload a GoPro video to get started.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate("/intake")}>
              Add session
            </button>
          </div>
        )}

        {showPanes && (
          <>
            {sessions.length > 0 && (
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
            )}
            <div className="data-panes">
              <aside className="data-pane-left">
                <SessionListPanel
                  sessions={filteredAsSessions}
                  selectedId={selectedId}
                  scope={scope}
                  onScopeChange={setScope}
                  onSelect={setSelectedId}
                  ownerDisplayNames={ownerDisplayNames}
                  emptyMessage={emptyMessage}
                />
              </aside>
              <section className="data-pane-right">
                <SessionWorkspace
                  session={session}
                  detail={detail}
                  sessions={sessions}
                  filters={filters}
                  scope={scope}
                  lapCount={session?.lapCount ?? 0}
                  totalLapCount={totalLapCount}
                  onOpenIntake={handleOpenIntake}
                  onEdit={() => setEditOpen(true)}
                  onDelete={handleDeleteFromStrip}
                  onVisibilityChange={() => void refreshDetail()}
                  canDelete={canDeleteSessions}
                />
              </section>
            </div>
            <CompareDock />
          </>
        )}

        {session && detail && editOpen && detail.isOwner !== false && (
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
            canDelete={canDeleteSessions}
          />
        )}
      </div>
    </AppShell>
  );
}
