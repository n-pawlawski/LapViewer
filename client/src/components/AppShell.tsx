import { useCompare } from "../context/CompareContext";
import { getSelectedSessionId } from "../lib/selectedSession";
import { useRouter } from "../lib/router";
import { formatLapTime } from "../utils/time";

export function AppShell({
  children,
  layout = "default",
}: {
  children: React.ReactNode;
  layout?: "default" | "intake-workstation";
}) {  const { navigate, pathname } = useRouter();
  const { canCompare, selectedLapIds } = useCompare();

  function handleIntakeNav() {
    const sessionId = getSelectedSessionId();
    navigate(sessionId ? `/intake?session=${sessionId}` : "/intake");
  }

  function handleAddSession() {
    navigate("/intake");
  }

  function handleCompareNav() {
    if (!canCompare) return;
    const ids = selectedLapIds.join(",");
    navigate(`/compare?laps=${ids}`);
  }

  function handleCompareTabClick() {
    if (canCompare) {
      handleCompareNav();
    }
  }

  const compareTabDisabled = !canCompare;

  return (
    <div className={`app ${layout === "intake-workstation" ? "app--intake-workstation" : ""}`}>      <header className="app-header">
        <div className="app-header-left">
          <span className="app-brand">LapViewer</span>
          <nav className="app-nav">
            <button
              type="button"
              className={`nav-tab ${pathname === "/" ? "nav-tab--active" : ""}`}
              onClick={() => navigate("/")}
            >
              Data
            </button>
            <button
              type="button"
              className={`nav-tab ${pathname === "/tracks" ? "nav-tab--active" : ""}`}
              onClick={() => navigate("/tracks")}
            >
              Tracks
            </button>
            <button
              type="button"
              className={`nav-tab ${pathname === "/intake" ? "nav-tab--active" : ""}`}
              onClick={handleIntakeNav}
            >
              Intake
            </button>
            <button
              type="button"
              className={`nav-tab ${pathname === "/compare" ? "nav-tab--active" : ""} ${compareTabDisabled ? "nav-tab--disabled" : ""}`}              onClick={handleCompareTabClick}
              title={
                compareTabDisabled
                  ? "Select 2 laps on Data to compare"
                  : "Open comparison"
              }
            >
              Compare
            </button>
          </nav>
        </div>
        <div className="app-header-right">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddSession}
          >
            Add session
          </button>
        </div>      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

export function CompareTray() {
  const {
    selectedLaps,
    removeLap,
    clearAll,
    canCompare,
    selectionHint,
    selectedLapIds,
  } = useCompare();
  const { navigate } = useRouter();

  const compareHint =
    selectedLapIds.length === 0
      ? "Select 2 laps to compare"
      : selectedLapIds.length === 1
        ? "Select 1 more lap"
        : null;

  function handleCompare() {
    if (!canCompare) return;
    navigate(`/compare?laps=${selectedLapIds.join(",")}`);
  }

  return (
    <div className="compare-tray">
      <div className="compare-tray-header">
        <span className="compare-tray-label">Compare</span>
        {selectedLaps.length === 0 && (
          <span className="compare-tray-empty">No laps selected</span>
        )}
      </div>
      <div className="compare-tray-chips">
        {selectedLaps.map(({ lap, session }) => (
          <span key={lap.id} className="compare-chip">
            {session.title} · Lap {lap.lapNumber} · {formatLapTime(lap.lapTimeMs)}
            <button
              type="button"
              className="compare-chip-remove"
              onClick={() => removeLap(lap.id)}
              aria-label={`Remove lap ${lap.lapNumber}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="compare-tray-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canCompare}
          onClick={handleCompare}
        >
          Compare selected ({selectedLapIds.length})
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={selectedLapIds.length === 0}
          onClick={clearAll}
        >
          Clear all
        </button>
        {(compareHint || selectionHint) && (
          <span className="compare-tray-hint">{selectionHint ?? compareHint}</span>
        )}
      </div>
    </div>
  );
}
