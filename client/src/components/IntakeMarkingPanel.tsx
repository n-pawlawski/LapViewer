import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMarker, createSplit, deleteMarker, updateMarker } from "../api/markers";
import { sessionVideoUrl, updateSession, type SessionDetail } from "../api/sessions";
import type { Lap, Marker, SessionStatus, Split } from "../types";
import type { TrackSplit } from "../api/tracks";
import { IntakeShortcutsModal } from "./IntakeShortcutsModal";
import { IntakeSidePanel, type IntakeSidePanelTab } from "./IntakeSidePanel";
import { bestLapTimeMsFromMarkers, lapNumberLeftOfTime, lapTimeMsAtMarker } from "../utils/laps";
import {
  findActionForEvent,
  formatShortcutBinding,
  loadIntakeShortcuts,
  saveIntakeShortcuts,
} from "../utils/intakeShortcuts";
import { seekJumpTarget } from "../utils/seek";
import {
  isTimeInsideLap,
  lapBounds,
  splitSegmentMs,
  nextEmptySplitIndex,
  splitForSlot,
  splitIndexForPlacementByTime,
  splitsByLapNumber,
  tailSegmentMs,
} from "../utils/splits";
import { formatLapTime, formatVideoTime, parseVideoTime } from "../utils/time";
import { MARKER_SNAP_SECONDS, nearestWithinThreshold } from "../utils/markers";
import { DEFAULT_VIDEO_FPS, frameStepSeconds } from "../utils/video";

type SaveState = "saved" | "saving" | "error";

interface IntakeMarkingPanelProps {
  sessionId: string;
  sessionTitle: string;
  status: SessionStatus;
  fileName: string;
  durationSeconds: number | null;
  markers: Marker[];
  splits: Split[];
  trackSplits: TrackSplit[];
  laps: Lap[];
  onSessionUpdated: (session: SessionDetail) => void;
  onBackToData: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function IntakeMarkingPanel({
  sessionId,
  sessionTitle,
  status,
  fileName,
  durationSeconds,
  markers,
  splits,
  trackSplits,
  laps,
  onSessionUpdated,
  onBackToData,
}: IntakeMarkingPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTimeRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [playing, setPlaying] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedLapNumber, setSelectedLapNumber] = useState<number | null>(null);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const [selectedSplitIndex, setSelectedSplitIndex] = useState<number | null>(null);
  const [shortcuts, setShortcuts] = useState(loadIntakeShortcuts);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<IntakeSidePanelTab>("laps");
  const durationPersisted = useRef(durationSeconds != null);
  const lastSyncedLapRef = useRef<number | null>(null);

  const playable = status === "ready";
  const frameStep = frameStepSeconds(DEFAULT_VIDEO_FPS);
  const splitMap = useMemo(() => splitsByLapNumber(splits), [splits]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (durationSeconds != null) {
      setDuration(durationSeconds);
      durationPersisted.current = true;
    }
  }, [durationSeconds]);

  const persistDuration = useCallback(
    async (seconds: number) => {
      if (durationPersisted.current) return;
      durationPersisted.current = true;
      try {
        const session = await updateSession(sessionId, { durationSeconds: seconds });
        onSessionUpdated(session);
      } catch {
        durationPersisted.current = false;
      }
    },
    [sessionId, onSessionUpdated],
  );

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      const max = duration > 0 ? duration : time;
      const clamped = Math.max(0, Math.min(max, time));
      if (video) {
        video.currentTime = clamped;
      }
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;
    },
    [duration],
  );

  const syncActiveLapFromSeeker = useCallback(
    (time: number) => {
      const lapNumber = lapNumberLeftOfTime(markers, time);

      if (lapNumber == null) {
        if (lastSyncedLapRef.current !== null) {
          lastSyncedLapRef.current = null;
          setSelectedMarkerId(null);
          setSelectedLapNumber(null);
          setSelectedSplitId(null);
          setSelectedSplitIndex(null);
        }
        return;
      }

      const marker = markers[lapNumber - 1];
      const lapSplits = splitMap.get(lapNumber) ?? [];
      const placementIndex =
        splitIndexForPlacementByTime(time, trackSplits, lapSplits) ??
        nextEmptySplitIndex(trackSplits, lapSplits) ??
        trackSplits[0]?.splitIndex ??
        null;

      if (lapNumber !== lastSyncedLapRef.current) {
        lastSyncedLapRef.current = lapNumber;
        setSelectedSplitId(null);
      }

      setSelectedMarkerId(marker.id);
      setSelectedLapNumber(lapNumber);
      setSelectedSplitIndex(placementIndex);
    },
    [markers, splitMap, trackSplits],
  );

  const seekAndSync = useCallback(
    (time: number) => {
      seek(time);
      syncActiveLapFromSeeker(time);
    },
    [seek, syncActiveLapFromSeeker],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const stepFrame = useCallback(
    (direction: -1 | 1) => {
      const video = videoRef.current;
      if (video) video.pause();
      setPlaying(false);
      seekAndSync(currentTimeRef.current + direction * frameStep);
    },
    [frameStep, seekAndSync],
  );

  const stepJump = useCallback(
    (direction: "left" | "right") => {
      const video = videoRef.current;
      if (video) video.pause();
      setPlaying(false);
      const dur = duration > 0 ? duration : (durationSeconds ?? 0);
      const target = seekJumpTarget(
        direction,
        currentTimeRef.current,
        markers,
        dur,
      );
      seekAndSync(target);
    },
    [markers, duration, durationSeconds, seekAndSync],
  );

  const stepSeek = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (video) video.pause();
      setPlaying(false);
      seekAndSync(currentTimeRef.current + deltaSeconds);
    },
    [seekAndSync],
  );

  async function runMarkerMutation(
    action: () => Promise<{ session: SessionDetail }>,
  ): Promise<SessionDetail | null> {
    setSaveState("saving");
    setSaveError(null);
    try {
      const result = await action();
      onSessionUpdated(result.session);
      setSaveState("saved");
      return result.session;
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Save failed");
      return null;
    }
  }

  const addMarkerAtCurrentTime = useCallback(() => {
    const time = currentTimeRef.current;
    const nearby = nearestWithinThreshold(markers, time, MARKER_SNAP_SECONDS);
    if (nearby) {
      setSelectedMarkerId(nearby.id);
      void runMarkerMutation(() => updateMarker(nearby.id, { timeSeconds: time }));
      return;
    }
    void runMarkerMutation(() => createMarker(sessionId, time));
  }, [sessionId, markers]);

  const addSplitAtCurrentTime = useCallback(async () => {
    if (selectedLapNumber == null) return;
    const bounds = lapBounds(laps, selectedLapNumber);
    if (!bounds) return;
    const time = currentTimeRef.current;
    if (!isTimeInsideLap(time, bounds.startSeconds, bounds.endSeconds)) return;

    const lapNumber = selectedLapNumber;
    const lapSplits = splits.filter((split) => split.lapNumber === lapNumber);
    const nearby = nearestWithinThreshold(lapSplits, time, MARKER_SNAP_SECONDS);
    if (nearby) {
      setSelectedSplitId(nearby.id);
      setSelectedSplitIndex(nearby.splitIndex);
      const session = await runMarkerMutation(() => updateMarker(nearby.id, { timeSeconds: time }));
      if (!session) return;
      const updatedLapSplits = session.splits.filter((split) => split.lapNumber === lapNumber);
      setSelectedSplitIndex(
        splitIndexForPlacementByTime(time, trackSplits, updatedLapSplits) ?? null,
      );
      return;
    }

    if (lapSplits.length >= trackSplits.length) return;

    const splitIndex =
      splitIndexForPlacementByTime(time, trackSplits, lapSplits) ??
      trackSplits[0]?.splitIndex;
    if (splitIndex == null) return;

    const session = await runMarkerMutation(() =>
      createSplit(sessionId, lapNumber, splitIndex, time),
    );
    if (!session) return;
    const updatedLapSplits = session.splits.filter((split) => split.lapNumber === lapNumber);
    setSelectedSplitIndex(
      splitIndexForPlacementByTime(time, trackSplits, updatedLapSplits) ?? null,
    );
    setSelectedSplitId(null);
  }, [sessionId, selectedLapNumber, laps, trackSplits, splits]);

  useEffect(() => {
    lastSyncedLapRef.current = null;
    syncActiveLapFromSeeker(currentTimeRef.current);
  }, [markers, syncActiveLapFromSeeker]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    setCurrentTime(time);
    currentTimeRef.current = time;
    syncActiveLapFromSeeker(time);
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setDuration(video.duration);
    void persistDuration(video.duration);
  }

  function handleDeleteMarker(markerId: string) {
    void runMarkerMutation(() => deleteMarker(markerId));
    if (selectedMarkerId === markerId) {
      setSelectedMarkerId(null);
      setSelectedLapNumber(null);
    }
    lastSyncedLapRef.current = null;
  }

  function handleMarkerTimeCommit(markerId: string, value: string) {
    const seconds = parseVideoTime(value);
    if (seconds == null) return;
    void runMarkerMutation(() => updateMarker(markerId, { timeSeconds: seconds }));
  }

  function handleDeleteSplit(splitId: string) {
    void runMarkerMutation(() => deleteMarker(splitId));
    if (selectedSplitId === splitId) {
      setSelectedSplitId(null);
      setSelectedSplitIndex(null);
    }
  }

  function handleSplitTimeCommit(splitId: string, value: string) {
    const seconds = parseVideoTime(value);
    if (seconds == null) return;
    void runMarkerMutation(() => updateMarker(splitId, { timeSeconds: seconds }));
  }
  function handleIgnoredChange(markerId: string, ignored: boolean) {
    void runMarkerMutation(() => updateMarker(markerId, { ignored }));
  }

  const removeTarget = useMemo(() => {
    if (selectedSplitId) {
      const split = splits.find((entry) => entry.id === selectedSplitId);
      if (split) {
        return {
          type: "split" as const,
          id: split.id,
          label: `${split.label} (Lap ${split.lapNumber})`,
        };
      }
    }

    if (selectedLapNumber != null) {
      const lapSplits = splitMap.get(selectedLapNumber) ?? [];
      const nearby = nearestWithinThreshold(
        lapSplits,
        currentTime,
        MARKER_SNAP_SECONDS,
      );
      if (nearby) {
        return {
          type: "split" as const,
          id: nearby.id,
          label: `${nearby.label} (Lap ${nearby.lapNumber})`,
        };
      }
    }

    if (selectedMarkerId) {
      const lapNumber = markers.findIndex((marker) => marker.id === selectedMarkerId) + 1;
      if (lapNumber > 0) {
        return {
          type: "lap" as const,
          id: selectedMarkerId,
          label: `Lap ${lapNumber} start`,
        };
      }
    }

    return null;
  }, [
    selectedSplitId,
    splits,
    selectedLapNumber,
    splitMap,
    currentTime,
    selectedMarkerId,
    markers,
  ]);

  const removeSelectedMarker = useCallback(() => {
    if (!removeTarget) return;
    if (removeTarget.type === "split") {
      handleDeleteSplit(removeTarget.id);
      return;
    }
    handleDeleteMarker(removeTarget.id);
  }, [removeTarget]);

  function handleMarkerClick(marker: Marker, _lapNumber: number) {
    seekAndSync(marker.timeSeconds);
  }

  function handleSplitClick(split: Split) {
    seekAndSync(split.timeSeconds);
    setSelectedSplitId(split.id);
    setSelectedSplitIndex(split.splitIndex);
  }

  function handleSplitSlotClick(lapNumber: number, splitIndex: number, split?: Split) {
    if (split) {
      seekAndSync(split.timeSeconds);
      setSelectedSplitId(split.id);
      setSelectedSplitIndex(split.splitIndex);
      return;
    }

    const marker = markers[lapNumber - 1];
    if (marker) seekAndSync(marker.timeSeconds);
    setSelectedSplitId(null);
    setSelectedSplitIndex(splitIndex);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (shortcutsModalOpen) return;

      if (e.key === "?" && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShortcutsModalOpen(true);
        return;
      }

      if (
        e.key === "Backspace" &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        removeTarget
      ) {
        e.preventDefault();
        removeSelectedMarker();
        return;
      }


      const action = findActionForEvent(e, shortcuts);
      if (!action) return;

      e.preventDefault();
      switch (action) {
        case "playPause":
          togglePlay();
          break;
        case "frameBack":
          stepFrame(-1);
          break;
        case "frameForward":
          stepFrame(1);
          break;
        case "jumpBack":
          stepJump("left");
          break;
        case "jumpForward":
          stepJump("right");
          break;
        case "seekBack5":
          stepSeek(-5);
          break;
        case "seekForward5":
          stepSeek(5);
          break;
        case "seekBack15":
          stepSeek(-15);
          break;
        case "seekForward15":
          stepSeek(15);
          break;
        case "addLap":
          addMarkerAtCurrentTime();
          break;
        case "addSplit":
          addSplitAtCurrentTime();
          break;
        case "removeMarker":
          removeSelectedMarker();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    shortcuts,
    shortcutsModalOpen,
    removeTarget,
    removeSelectedMarker,
    togglePlay,
    addMarkerAtCurrentTime,
    addSplitAtCurrentTime,
    removeSelectedMarker,
    stepFrame,
    stepJump,
    stepSeek,
  ]);

  const shortcutsHint = useMemo(
    () =>
      [
        `${formatShortcutBinding(shortcuts.frameBack)}/${formatShortcutBinding(shortcuts.frameForward)} frame`,
        `${formatShortcutBinding(shortcuts.jumpBack)}/${formatShortcutBinding(shortcuts.jumpForward)} jump`,
        `${formatShortcutBinding(shortcuts.seekBack5)}/${formatShortcutBinding(shortcuts.seekForward5)} ±5s`,
        `${formatShortcutBinding(shortcuts.seekBack15)}/${formatShortcutBinding(shortcuts.seekForward15)} ±15s`,
        `${formatShortcutBinding(shortcuts.playPause)} play`,
        `${formatShortcutBinding(shortcuts.addLap)} lap`,
        `${formatShortcutBinding(shortcuts.addSplit)} split`,
        `${formatShortcutBinding(shortcuts.removeMarker)} remove`,
      ].join(" · "),
    [shortcuts],
  );

  const selectedLapBounds =
    selectedLapNumber != null ? lapBounds(laps, selectedLapNumber) : null;
  const selectedLapSplits =
    selectedLapNumber != null ? (splitMap.get(selectedLapNumber) ?? []) : [];
  const placementSplitIndex =
    selectedLapNumber != null
      ? splitIndexForPlacementByTime(currentTime, trackSplits, selectedLapSplits)
      : null;
  const nearbySplit =
    selectedLapNumber != null
      ? nearestWithinThreshold(selectedLapSplits, currentTime, MARKER_SNAP_SECONDS)
      : undefined;
  const canAddSplit =
    trackSplits.length > 0 &&
    selectedLapNumber != null &&
    selectedLapBounds != null &&
    isTimeInsideLap(
      currentTime,
      selectedLapBounds.startSeconds,
      selectedLapBounds.endSeconds,
    ) &&
    (nearbySplit != null ||
      (selectedLapSplits.length < trackSplits.length && placementSplitIndex != null));

  const firstMarkerTime = markers[0]?.timeSeconds;
  const bestLapMs = bestLapTimeMsFromMarkers(markers, duration > 0 ? duration : durationSeconds);

  return (
    <section className="intake-marking">
      <div className="intake-marking-header">
        <div className="intake-marking-header-left">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToData}>
            ← Data
          </button>
          <h2>{sessionTitle}</h2>
        </div>
        <span className={`intake-save-state intake-save-state--${saveState}`}>
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved ✓"}
          {saveState === "error" && "Save error"}
        </span>
      </div>

      {!playable && (
        <p className="data-status data-status--error">
          Video file is not available ({status}). Check the path on disk.
        </p>
      )}

      {playable && (
        <div className="intake-marking-player-row intake-marking-player-row--with-panel">
          <div className="intake-marking-player">
          <div className="intake-player-wrap">
            <video
              ref={videoRef}
              className="intake-player"
              src={sessionVideoUrl(sessionId)}
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
            />
          </div>

          <div className="intake-timeline">
            <div className="intake-timeline-track">
              {duration > 0 &&
                markers.map((marker, index) => (
                  <button
                    key={marker.id}
                    type="button"
                    className={`intake-timeline-marker intake-timeline-marker--lap ${
                      selectedMarkerId === marker.id ? "intake-timeline-marker--selected" : ""
                    }`}
                    style={{ left: `${(marker.timeSeconds / duration) * 100}%` }}
                    title={`Lap ${index + 1} — ${formatVideoTime(marker.timeSeconds)}`}
                    onClick={() => handleMarkerClick(marker, index + 1)}
                  />
                ))}
              {duration > 0 &&
                splits.map((split) => (
                  <button
                    key={split.id}
                    type="button"
                    className={`intake-timeline-marker intake-timeline-marker--split ${
                      selectedSplitId === split.id ? "intake-timeline-marker--selected" : ""
                    }`}
                    style={{ left: `${(split.timeSeconds / duration) * 100}%` }}
                    title={`Lap ${split.lapNumber} ${split.label} — ${formatVideoTime(split.timeSeconds)}`}
                    onClick={() => handleSplitClick(split)}
                  />
                ))}            </div>
            <input
              type="range"
              className="intake-scrubber"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={(e) => seekAndSync(Number(e.target.value))}
            />
          </div>

          <div className="intake-transport">
            <button type="button" className="btn btn-transport" onClick={togglePlay}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => stepFrame(-1)}>
              ← Frame
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => stepFrame(1)}>
              Frame →
            </button>
            <span className="intake-time-readout">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>
            <button type="button" className="btn btn-primary" onClick={addMarkerAtCurrentTime}>
              + Lap
            </button>
            <button
              type="button"
              className="btn btn-split"
              onClick={addSplitAtCurrentTime}
              disabled={!canAddSplit}
              title={
                trackSplits.length === 0
                  ? "Configure splits on the Tracks page"
                  : selectedLapNumber == null
                    ? "Select a lap first"
                    : canAddSplit
                      ? nearbySplit
                        ? `Adjust ${nearbySplit.label} (snaps within ${MARKER_SNAP_SECONDS}s)`
                        : `Place ${
                            trackSplits.find((s) => s.splitIndex === placementSplitIndex)?.name ??
                            "split"
                          } on Lap ${selectedLapNumber} by lap time`
                      : "Playhead must be inside the lap with room for another split"
              }
            >
              + Split
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={removeSelectedMarker}
              disabled={!removeTarget}
              title={
                removeTarget
                  ? `Remove ${removeTarget.label}`
                  : "Select a marker, split, or scrub near a split to remove"
              }
            >
              Remove
            </button>
            <span className="field-hint intake-shortcuts">{shortcutsHint}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShortcutsModalOpen(true)}
            >
              Shortcuts
            </button>
          </div>
          </div>

          <IntakeSidePanel
            activeTab={sidePanelTab}
            onTabChange={setSidePanelTab}
            proposalCount={0}
            lapCount={markers.length}
            detect={<p className="intake-detection-idle-hint">Auto lap detection is in development on a separate branch.</p>}
            laps={
              <div className="intake-marker-table-wrap">
                {trackSplits.length === 0 && markers.length > 0 && (
                  <p className="data-status data-status--warn intake-track-splits-hint">
                    Assign a track with splits on the <strong>Tracks</strong> page before marking
                    splits.
                  </p>
                )}
                {markers.length === 0 ? (
                  <p className="intake-empty-hint">
                    Scrub or frame-step to each lap start, then press <strong>M</strong> or{" "}
                    <strong>+ Lap</strong>.
                  </p>
                ) : trackSplits.length === 0 ? (
                  <p className="intake-empty-hint">
                    Laps are marked. Configure splits for this track, then select a lap and fill each
                    split slot with <strong>S</strong>.
                  </p>
                ) : (
                  <table className="intake-marker-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Segment</th>
                    <th>Ignore</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {firstMarkerTime != null && firstMarkerTime > 0.5 && (
                    <tr className="intake-marker-row intake-marker-row--outlap">
                      <td>Outlap</td>
                      <td>{formatVideoTime(0)}</td>
                      <td>{formatVideoTime(firstMarkerTime)}</td>
                      <td />
                      <td />
                    </tr>
                  )}
                  {markers.map((marker, index) => {
                    const lapNumber = index + 1;
                    const lap = laps[index];
                    const lapSplits = splitMap.get(lapNumber) ?? [];
                    const lapTimeMs = lapTimeMsAtMarker(
                      markers,
                      index,
                      duration > 0 ? duration : durationSeconds,
                    );
                    const isBest =
                      !marker.ignored && bestLapMs != null && lapTimeMs === bestLapMs;
                    const lapSelected = selectedLapNumber === lapNumber && !selectedSplitId;
                    return (
                      <Fragment key={marker.id}>
                        <tr
                          className={`intake-marker-row intake-marker-row--lap ${
                            selectedMarkerId === marker.id ? "intake-marker-row--selected" : ""
                          } ${lapSelected ? "intake-marker-row--lap-active" : ""} ${
                            isBest ? "intake-marker-row--best" : ""
                          } ${marker.ignored ? "intake-marker-row--ignored" : ""}`}
                          onClick={() => handleMarkerClick(marker, lapNumber)}
                        >
                          <td>Lap {lapNumber}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              className="intake-marker-time-input"
                              defaultValue={formatVideoTime(marker.timeSeconds)}
                              key={marker.timeSeconds}
                              onBlur={(e) => handleMarkerTimeCommit(marker.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                            />
                          </td>
                          <td className="lap-time-cell">
                            {lapTimeMs != null ? formatLapTime(lapTimeMs) : "—"}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <label className="intake-ignore-label">
                              <input
                                type="checkbox"
                                checked={marker.ignored ?? false}
                                onChange={(e) =>
                                  handleIgnoredChange(marker.id, e.target.checked)
                                }
                              />
                              Ignore
                            </label>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              aria-label={`Remove lap ${lapNumber} start marker`}
                              onClick={() => handleDeleteMarker(marker.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                        {trackSplits.map((trackSplit, splitIdx) => {
                          const split = splitForSlot(lapSplits, trackSplit.splitIndex);
                          const priorSplit =
                            splitIdx > 0
                              ? splitForSlot(lapSplits, trackSplits[splitIdx - 1].splitIndex)
                              : undefined;
                          const segmentMs = split
                            ? splitSegmentMs(split, marker.timeSeconds, priorSplit)
                            : null;
                          const slotSelected =
                            selectedLapNumber === lapNumber &&
                            selectedSplitIndex === trackSplit.splitIndex;
                          return (
                            <tr
                              key={`${lapNumber}-${trackSplit.splitIndex}`}
                              className={`intake-marker-row intake-split-row ${
                                split && selectedSplitId === split.id
                                  ? "intake-marker-row--selected"
                                  : ""
                              } ${slotSelected ? "intake-split-row--slot-active" : ""} ${
                                !split ? "intake-split-row--empty" : ""
                              }`}
                              onClick={() =>
                                handleSplitSlotClick(lapNumber, trackSplit.splitIndex, split)
                              }
                            >
                              <td>{trackSplit.name}</td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {split ? (
                                  <input
                                    type="text"
                                    className="intake-marker-time-input"
                                    defaultValue={formatVideoTime(split.timeSeconds)}
                                    key={split.timeSeconds}
                                    onBlur={(e) =>
                                      handleSplitTimeCommit(split.id, e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="lap-time-cell">
                                {segmentMs != null ? formatLapTime(segmentMs) : "—"}
                              </td>
                              <td />
                              <td onClick={(e) => e.stopPropagation()}>
                                {split ? (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    aria-label={`Remove ${split.label} on lap ${lapNumber}`}
                                    onClick={() => handleDeleteSplit(split.id)}
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                        {trackSplits.length > 0 && lap && (
                          <tr className="intake-marker-row intake-split-tail-row">
                            <td>→ end</td>
                            <td>{formatVideoTime(lap.endSeconds)}</td>
                            <td className="lap-time-cell">
                              {formatLapTime(
                                tailSegmentMs(
                                  marker.timeSeconds,
                                  lap.endSeconds,
                                  lapSplits[lapSplits.length - 1],
                                ),
                              )}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
              </div>
            }
            details={
              <dl className="session-details-meta intake-details-meta">
                <div>
                  <dt>File</dt>
                  <dd>{fileName}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{duration > 0 ? formatVideoTime(duration) : "—"}</dd>
                </div>
                <div>
                  <dt>Frame step</dt>
                  <dd>1/{DEFAULT_VIDEO_FPS}s</dd>
                </div>
                <div>
                  <dt>Markers</dt>
                  <dd>{markers.length}</dd>
                </div>
                <div>
                  <dt>Splits</dt>
                  <dd>{splits.length}</dd>
                </div>
                <div>
                  <dt>Laps</dt>
                  <dd>{laps.length}</dd>
                </div>
              </dl>
            }
          />
        </div>
      )}

      <IntakeShortcutsModal
        open={shortcutsModalOpen}
        shortcuts={shortcuts}
        onClose={() => setShortcutsModalOpen(false)}
        onSave={(next) => {
          setShortcuts(next);
          saveIntakeShortcuts(next);
        }}
      />

      {saveError && <p className="data-status data-status--error">{saveError}</p>}
    </section>
  );
}
