import type { RefObject } from "react";
import { sessionIsPlayable, sessionVideoUrl } from "../api/sessions";
import type { SelectedLap } from "../context/CompareContext";
import type { AdjustableMarker, ComparePaneWindow } from "../utils/compare";
import { formatComparisonTime, formatLapTime } from "../utils/time";

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
}) {
  const { session, lap } = pane;
  const playable = sessionIsPlayable(session.status) && window != null;
  const videoUrl = playable ? sessionVideoUrl(session.id) : "";
  const canAdjust = playable && adjustableMarker != null && !frameAdjustDisabled;

  return (
    <div className={`compare-pane ${frozen ? "compare-pane--frozen" : ""}`}>
      <div className="compare-pane-header">
        {session.title} · Lap {lap.lapNumber} · {formatLapTime(lap.lapTimeMs)}
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
