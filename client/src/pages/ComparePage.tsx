import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { fetchSession, sessionIsPlayable, type SessionDetail } from "../api/sessions";
import { updateMarker } from "../api/markers";
import { AppShell } from "../components/AppShell";
import { useCompare, type SelectedLap } from "../context/CompareContext";
import {
  ComparePane,
  CompareVisualsLoading,
  ComparisonTransport,
} from "../components/ComparisonView";
import { ComparisonChart } from "../components/ComparisonChart";
import { useComparisonPlayback } from "../hooks/useComparisonPlayback";
import { useLapColors } from "../hooks/useLapColors";
import { useRouter, useSearchParams } from "../lib/router";
import { parseLapId } from "../utils/lapIds";
import {
  availableSyncPoints,
  buildPaneWindows,
  findAdjustableMarkerAtTime,
  selectedLapFromDetail,
  syncPointFromParam,
  syncPointToParam,
  type ComparePaneWindow,
  type CompareSyncPoint,
} from "../utils/compare";
import { DEFAULT_VIDEO_FPS, frameStepSeconds } from "../utils/video";

async function resolvePane(lapId: string): Promise<SelectedLap | null> {
  const parsed = parseLapId(lapId);
  if (!parsed) return null;

  const detail = await fetchSession(parsed.sessionId);
  return selectedLapFromDetail(detail, lapId);
}

function absoluteTimeForPane(
  paneIndex: 0 | 1,
  windows: [ComparePaneWindow | null, ComparePaneWindow | null],
  comparisonTime: number,
  frozen: [boolean, boolean],
): number | null {
  const window = windows[paneIndex];
  if (!window) return null;
  if (frozen[paneIndex]) {
    return window.startSeconds + window.durationSeconds;
  }
  return window.startSeconds + comparisonTime;
}

function compareSpaceShouldIgnore(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type.toLowerCase();
    return (
      type === "text" ||
      type === "search" ||
      type === "number" ||
      type === "password" ||
      type === "email"
    );
  }
  if (target.isContentEditable) return true;
  return false;
}

function CompareView({
  initialPanes,
  syncPoint,
  syncOptions,
  onSyncPointChange,
  onPanesChange,
}: {
  initialPanes: [SelectedLap, SelectedLap];
  syncPoint: CompareSyncPoint;
  syncOptions: CompareSyncPoint[];
  onSyncPointChange: (point: CompareSyncPoint) => void;
  onPanesChange: (panes: [SelectedLap, SelectedLap]) => void;
}) {
  const { navigate } = useRouter();
  const [panes, setPanes] = useState(initialPanes);
  const [adjusting, setAdjusting] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionDetail>>({});
  const [lapSelectBusy, setLapSelectBusy] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const frameStep = frameStepSeconds(DEFAULT_VIDEO_FPS);

  const visualsLoadKey = `${panes[0].lap.id}|${panes[1].lap.id}|${syncPointToParam(syncPoint)}`;

  const sessionIds = useMemo(
    () => [...new Set(panes.map((pane) => pane.session.id))],
    [panes],
  );

  useEffect(() => {
    let cancelled = false;
    for (const sessionId of sessionIds) {
      void fetchSession(sessionId).then((detail) => {
        if (cancelled) return;
        setSessionDetails((prev) => {
          if (prev[sessionId]) return prev;
          return { ...prev, [sessionId]: detail };
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [sessionIds]);

  function sessionLapsForPane(paneIndex: 0 | 1) {
    const sessionId = panes[paneIndex].session.id;
    const detail = sessionDetails[sessionId];
    const laps = detail?.laps ?? [panes[paneIndex].lap];
    return laps.filter((lap) => !lap.ignored);
  }

  const paneIsReadOnly = useCallback(
    (paneIndex: 0 | 1) => {
      const sessionId = panes[paneIndex].session.id;
      const detail = sessionDetails[sessionId];
      return detail?.isOwner === false;
    },
    [panes, sessionDetails],
  );

  const handleLapSelect = useCallback(
    async (paneIndex: 0 | 1, lapId: string) => {
      if (panes[paneIndex].lap.id === lapId) return;
      const otherLapId = panes[paneIndex === 0 ? 1 : 0].lap.id;
      if (lapId === otherLapId) return;

      setLapSelectBusy(true);
      try {
        const sessionId = panes[paneIndex].session.id;
        let detail = sessionDetails[sessionId];
        if (!detail) {
          detail = await fetchSession(sessionId);
          setSessionDetails((prev) => ({ ...prev, [sessionId]: detail }));
        }
        const nextPane = selectedLapFromDetail(detail, lapId);
        if (!nextPane) return;

        const nextPanes: [SelectedLap, SelectedLap] = [...panes] as [SelectedLap, SelectedLap];
        nextPanes[paneIndex] = nextPane;
        setPanes(nextPanes);
        onPanesChange(nextPanes);
      } finally {
        setLapSelectBusy(false);
      }
    },
    [panes, sessionDetails, onPanesChange],
  );

  useEffect(() => {
    setPanes(initialPanes);
  }, [initialPanes]);

  const windows = useMemo(
    () => buildPaneWindows(panes, syncPoint),
    [panes, syncPoint],
  );
  const playback = useComparisonPlayback(panes, windows);
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const lapColors = useLapColors();

  useEffect(() => {
    setContentLoading(true);
  }, [visualsLoadKey]);

  useEffect(() => {
    const panesReady = windows.map((window, index) => {
      if (!window || !sessionIsPlayable(panes[index].session.status)) return true;
      return playback.videosReady[index];
    });
    if (!panesReady.every(Boolean)) return;
    setContentLoading(false);
    playbackRef.current.seek(0, true);
  }, [playback.videosReady, visualsLoadKey, windows, panes]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat) return;
      if (compareSpaceShouldIgnore(event.target)) return;
      event.preventDefault();
      playbackRef.current.togglePlay();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const getAdjustable = useCallback(
    (paneIndex: 0 | 1) => {
      if (playback.playing || adjusting || paneIsReadOnly(paneIndex)) return null;
      const absoluteTime = absoluteTimeForPane(
        paneIndex,
        windows,
        playback.comparisonTime,
        playback.frozen,
      );
      if (absoluteTime == null) return null;
      return findAdjustableMarkerAtTime(panes[paneIndex], absoluteTime, frameStep);
    },
    [playback.playing, playback.comparisonTime, playback.frozen, adjusting, panes, windows, frameStep, paneIsReadOnly],
  );

  const adjustFrame = useCallback(
    async (paneIndex: 0 | 1, direction: -1 | 1) => {
      if (paneIsReadOnly(paneIndex)) return;
      const adjustable = getAdjustable(paneIndex);
      if (!adjustable) return;

      const newAbsTime = adjustable.timeSeconds + direction * frameStep;
      setAdjusting(true);
      setFrameError(null);

      try {
        const result = await updateMarker(adjustable.markerId, { timeSeconds: newAbsTime });
        const session = result.session;

        const nextPanes: [SelectedLap, SelectedLap] = [
          panes[0].session.id === session.id
            ? (selectedLapFromDetail(session, panes[0].lap.id) ?? panes[0])
            : panes[0],
          panes[1].session.id === session.id
            ? (selectedLapFromDetail(session, panes[1].lap.id) ?? panes[1])
            : panes[1],
        ];

        const updatedWindows = buildPaneWindows(nextPanes, syncPoint);
        const win = updatedWindows[paneIndex];
        const comparisonTime =
          win != null ? Math.max(0, Math.min(win.durationSeconds, newAbsTime - win.startSeconds)) : 0;

        setSessionDetails((prev) => ({ ...prev, [session.id]: session }));
        flushSync(() => setPanes(nextPanes));
        onPanesChange(nextPanes);
        playbackRef.current.seek(comparisonTime, true);
      } catch (err) {
        setFrameError(err instanceof Error ? err.message : "Could not adjust marker");
      } finally {
        setAdjusting(false);
      }
    },
    [getAdjustable, frameStep, panes, syncPoint, onPanesChange, paneIsReadOnly],
  );

  const adjustable0 = getAdjustable(0);
  const adjustable1 = getAdjustable(1);
  const frameHint =
    frameError ??
    (playback.playing
      ? "Pause on a marker to nudge frames"
      : paneIsReadOnly(0) && paneIsReadOnly(1)
        ? "Marker adjustment is only available on your own sessions"
        : adjustable0 || adjustable1
          ? "Frame buttons nudge the aligned lap or split marker"
          : "Scrub to a lap or split marker to enable frame adjust");

  return (
    <AppShell layout="compare">
      <div className="compare-page">
        <div className="compare-page-header">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>
            ← Back to Data
          </button>
          {syncOptions.length > 1 && (
            <label className="compare-sync-select">
              <span>Sync from</span>
              <select
                value={syncPointToParam(syncPoint)}
                onChange={(e) => {
                  const next = syncPointFromParam(e.target.value, syncOptions);
                  onSyncPointChange(next);
                }}
              >
                {syncOptions.map((option) => (
                  <option key={syncPointToParam(option)} value={syncPointToParam(option)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={`compare-visuals${contentLoading ? " compare-visuals--loading" : ""}`}>
          <ComparisonChart
            panes={panes}
            windows={windows}
            comparisonTime={playback.comparisonTime}
            maxDuration={playback.maxDuration}
            onSeek={playback.seek}
          />
          <div className="compare-grid">
            <ComparePane
              pane={panes[0]}
              window={windows[0]}
              videoRef={playback.videoRefs[0]}
              frozen={playback.frozen[0]}
              onMetadataLoaded={() => playback.onVideoMetadataLoaded(0)}
              adjustableMarker={adjustable0}
              onAdjustFrame={(direction) => void adjustFrame(0, direction)}
              frameAdjustDisabled={playback.playing || paneIsReadOnly(0)}
              adjusting={adjusting}
              lapColor={lapColors[0]}
              lapSlotLabel="L1"
              sessionLaps={sessionLapsForPane(0)}
              otherPaneLapId={panes[1].lap.id}
              otherPaneLapTimeMs={panes[1].lap.lapTimeMs}
              onLapSelect={(lapId) => void handleLapSelect(0, lapId)}
              lapSelectDisabled={lapSelectBusy || playback.playing}
            />
            <ComparePane
              pane={panes[1]}
              window={windows[1]}
              videoRef={playback.videoRefs[1]}
              frozen={playback.frozen[1]}
              onMetadataLoaded={() => playback.onVideoMetadataLoaded(1)}
              adjustableMarker={adjustable1}
              onAdjustFrame={(direction) => void adjustFrame(1, direction)}
              frameAdjustDisabled={playback.playing || paneIsReadOnly(1)}
              adjusting={adjusting}
              lapColor={lapColors[1]}
              lapSlotLabel="L2"
              sessionLaps={sessionLapsForPane(1)}
              otherPaneLapId={panes[0].lap.id}
              otherPaneLapTimeMs={panes[0].lap.lapTimeMs}
              onLapSelect={(lapId) => void handleLapSelect(1, lapId)}
              lapSelectDisabled={lapSelectBusy || playback.playing}
            />
          </div>
          {contentLoading && <CompareVisualsLoading />}
        </div>
        <ComparisonTransport
          comparisonTime={playback.comparisonTime}
          maxDuration={playback.maxDuration}
          playing={playback.playing}
          onTogglePlay={playback.togglePlay}
          onSeek={playback.seek}
          frameHint={frameHint}
        />
      </div>
    </AppShell>
  );
}

export function ComparePage() {
  const { navigate, pathname, search } = useRouter();
  const searchParams = useSearchParams();
  const { selectedLaps, selectedLapIds, setComparePair } = useCompare();
  const [resolved, setResolved] = useState<[SelectedLap, SelectedLap] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncPoint, setSyncPoint] = useState<CompareSyncPoint>({
    type: "lapStart",
    label: "Lap start",
  });

  const urlLapIds = useMemo(() => {
    const raw = searchParams.get("laps");
    if (!raw) return [];
    return raw.split(",").filter(Boolean);
  }, [searchParams]);

  const targetIds = urlLapIds.length === 2 ? urlLapIds : selectedLapIds;

  useEffect(() => {
    if (targetIds.length !== 2) {
      setResolved(null);
      return;
    }

    if (
      resolved &&
      resolved[0].lap.id === targetIds[0] &&
      resolved[1].lap.id === targetIds[1]
    ) {
      return;
    }

    const fromCache =
      selectedLaps.length === 2 &&
      targetIds.every((id) => selectedLaps.some((p) => p.lap.id === id));

    if (fromCache) {
      const ordered = targetIds.map(
        (id) => selectedLaps.find((p) => p.lap.id === id)!,
      ) as [SelectedLap, SelectedLap];
      setResolved(ordered);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(targetIds.map((id) => resolvePane(id)))
      .then((panes) => {
        if (cancelled) return;
        if (panes[0] && panes[1]) {
          setResolved([panes[0], panes[1]]);
        } else {
          setResolved(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetIds, selectedLaps, resolved]);

  const syncOptions = useMemo(
    () => (resolved ? availableSyncPoints(resolved) : []),
    [resolved],
  );

  useEffect(() => {
    if (!resolved) return;
    const options = availableSyncPoints(resolved);
    const fromUrl = syncPointFromParam(searchParams.get("sync"), options);
    setSyncPoint(fromUrl);
  }, [resolved, searchParams]);

  useEffect(() => {
    if (!resolved) return;
    const lapParam = `${resolved[0].lap.id},${resolved[1].lap.id}`;
    const syncParam = syncPointToParam(syncPoint);
    const desired = `/compare?laps=${lapParam}&sync=${syncParam}`;
    const current = `${pathname}${search}`;
    if (current !== desired) {
      navigate(desired);
    }
  }, [resolved, syncPoint, navigate, pathname, search]);

  function handlePanesChange(nextPanes: [SelectedLap, SelectedLap]) {
    setResolved(nextPanes);
    setComparePair(nextPanes);
    const syncParam = syncPointToParam(syncPoint);
    navigate(`/compare?laps=${nextPanes[0].lap.id},${nextPanes[1].lap.id}&sync=${syncParam}`);
  }

  function handleSyncPointChange(point: CompareSyncPoint) {
    setSyncPoint(point);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="stub-page">
          <p>Loading comparison…</p>
        </div>
      </AppShell>
    );
  }

  if (!resolved) {
    return (
      <AppShell>
        <div className="stub-page">
          <h1>Compare</h1>
          <p className="stub-page-lead">Select exactly 2 laps on the Data screen to compare.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/")}>
            ← Back to Data
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <CompareView
      initialPanes={resolved}
      syncPoint={syncPoint}
      syncOptions={syncOptions}
      onSyncPointChange={handleSyncPointChange}
      onPanesChange={handlePanesChange}
    />
  );
}
