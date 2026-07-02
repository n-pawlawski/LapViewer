import { useEffect, useRef, type CSSProperties, RefObject } from "react";
import { sessionIsPlayable, sessionVideoUrl } from "../api/sessions";
import type { SelectedLap } from "../context/CompareContext";
import type { Lap } from "../types";
import type { AdjustableMarker, ComparePaneWindow } from "../utils/compare";
import { formatComparisonTime, formatLapTime } from "../utils/time";

function formatCompareLapOptionLabel(
  lap: Lap,
  otherPaneLapId: string,
  otherPaneLapTimeMs: number | null,
): { label: string; tone: "slower" | "faster" | "neutral" | "other" } {
  const base = `Lap ${lap.lapNumber} · ${formatLapTime(lap.lapTimeMs)}`;
  if (lap.id === otherPaneLapId) {
    return { label: `${base} (other pane)`, tone: "other" };
  }
  if (otherPaneLapTimeMs == null) {
    return { label: base, tone: "neutral" };
  }
  const deltaSec = (lap.lapTimeMs - otherPaneLapTimeMs) / 1000;
  if (Math.abs(deltaSec) < 0.005) {
    return { label: base, tone: "neutral" };
  }
  const deltaText = `(${deltaSec > 0 ? "+" : ""}${deltaSec.toFixed(2)})`;
  return {
    label: `${base} ${deltaText}`,
    tone: deltaSec > 0 ? "slower" : "faster",
  };
}

export function CompareVisualsLoading() {
  return (
    <div className="compare-visuals-loading" aria-live="polite" aria-busy="true">
      <div className="compare-visuals-loading-spinner" aria-hidden />
      <span>Loading…</span>
    </div>
  );
}

export function ComparisonTransport({
  comparisonTime,
  maxDuration,
  playing,
  onTogglePlay,
  onSeek,
  frameHint,
}: {
  comparisonTime: number;
  maxDuration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  frameHint?: string | null;
}) {
  return (
    <div className="comparison-transport">
      <button type="button" className="btn btn-transport" onClick={onTogglePlay}>
        {playing ? "Pause" : "Play"}
      </button>
      <input
        type="range"
        className="comparison-scrubber"
        min={0}
        max={maxDuration}
        step={0.1}
        value={comparisonTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Comparison timeline"
      />
      <span className="comparison-time-readout">
        {formatComparisonTime(comparisonTime)} / {formatComparisonTime(maxDuration)}
      </span>
      <span className="comparison-audio-note">Audio: muted</span>
      {frameHint && <span className="comparison-frame-hint">{frameHint}</span>}
    </div>
  );
}

export function ComparePane({
  pane,
  window,
  videoRef,
  frozen,
  onMetadataLoaded,
  adjustableMarker,
  onAdjustFrame,
  frameAdjustDisabled,
  adjusting,
  lapColor,
  lapSlotLabel,
  sessionLaps,
  otherPaneLapId,
  otherPaneLapTimeMs,
  onLapSelect,
  lapSelectDisabled,
}: {
  pane: SelectedLap;
  window: ComparePaneWindow | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  frozen: boolean;
  onMetadataLoaded: () => void;
  adjustableMarker: AdjustableMarker | null;
  onAdjustFrame: (direction: -1 | 1) => void;
  frameAdjustDisabled: boolean;
  adjusting: boolean;
  lapColor: string;
  lapSlotLabel: string;
  sessionLaps: Lap[];
  otherPaneLapId: string;
  otherPaneLapTimeMs: number | null;
  onLapSelect: (lapId: string) => void;
  lapSelectDisabled?: boolean;
}) {
  const { session, lap } = pane;
  const playable = sessionIsPlayable(session.status) && window != null;
  const videoUrl = playable ? sessionVideoUrl(session.id) : "";
  const canAdjust = playable && adjustableMarker != null && !frameAdjustDisabled;

  const onMetadataLoadedRef = useRef(onMetadataLoaded);
  onMetadataLoadedRef.current = onMetadataLoaded;

  const mediaSyncKey = `${pane.lap.id}|${window?.startSeconds ?? ""}|${window?.durationSeconds ?? ""}|${videoUrl}`;
  const appliedMediaSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playable || !window) return;
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;

    if (appliedMediaSyncKeyRef.current !== mediaSyncKey) {
      video.currentTime = window.startSeconds;
      appliedMediaSyncKeyRef.current = mediaSyncKey;
    }
    onMetadataLoadedRef.current();
  }, [mediaSyncKey, playable, window, videoRef]);

  return (
    <div
      className={`compare-pane ${frozen ? "compare-pane--frozen" : ""}`}
      style={{ "--lap-color": lapColor } as CSSProperties}
    >
      <div className="compare-pane-header">
        <span className="compare-pane-header-swatch" aria-hidden />
        <span className="compare-pane-header-slot">{lapSlotLabel}</span>
        <label className="compare-pane-lap-select-wrap">
          <span className="sr-only">Select lap for {session.title}</span>
          <select
            className="compare-pane-lap-select"
            value={lap.id}
            disabled={lapSelectDisabled || sessionLaps.length <= 1}
            onChange={(e) => onLapSelect(e.target.value)}
          >
            {sessionLaps.map((option) => {
              const { label, tone } = formatCompareLapOptionLabel(
                option,
                otherPaneLapId,
                otherPaneLapTimeMs,
              );
              return (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={option.id === otherPaneLapId}
                  className={
                    tone === "slower"
                      ? "compare-pane-lap-option--slower"
                      : tone === "faster"
                        ? "compare-pane-lap-option--faster"
                        : undefined
                  }
                >
                  {label}
                </option>
              );
            })}
          </select>
        </label>
        <span className="compare-pane-header-session">{session.title}</span>
        {frozen && playable && <span className="compare-pane-frozen-badge">Frozen</span>}
        {!playable && (
          <span className="compare-pane-frozen-badge">
            {window == null ? "No sync point" : "Unavailable"}
          </span>
        )}
      </div>
      {playable ? (
        <video
          ref={videoRef}
          className="compare-pane-video"
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => {
            if (videoRef.current && window) {
              videoRef.current.currentTime = window.startSeconds;
            }
            onMetadataLoaded();
          }}
        />
      ) : (
        <div className="compare-pane-unavailable">
          {window == null
            ? "Selected sync point is not marked on this lap."
            : "Video file is missing or not ready."}
        </div>
      )}
      <div className="compare-pane-frame-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!canAdjust || adjusting}
          title={
            canAdjust
              ? `Nudge ${adjustableMarker.label} earlier one frame`
              : "Pause on a lap or split marker to adjust"
          }
          onClick={() => onAdjustFrame(-1)}
        >
          ← Frame
        </button>
        <span className="compare-pane-frame-label">
          {canAdjust ? adjustableMarker.label : "Frame adjust"}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!canAdjust || adjusting}
          title={
            canAdjust
              ? `Nudge ${adjustableMarker.label} later one frame`
              : "Pause on a lap or split marker to adjust"
          }
          onClick={() => onAdjustFrame(1)}
        >
          Frame →
        </button>
      </div>
    </div>
  );
}
