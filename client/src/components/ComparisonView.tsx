import type { RefObject } from "react";
import { sessionIsPlayable, sessionVideoUrl } from "../api/sessions";
import type { SelectedLap } from "../context/CompareContext";
import { formatComparisonTime, formatLapTime } from "../utils/time";

export function ComparisonTransport({
  comparisonTime,
  maxDuration,
  playing,
  onTogglePlay,
  onSeek,
}: {
  comparisonTime: number;
  maxDuration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
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
    </div>
  );
}

export function ComparePane({
  pane,
  videoRef,
  frozen,
}: {
  pane: SelectedLap;
  videoRef: RefObject<HTMLVideoElement | null>;
  frozen: boolean;
}) {
  const { session, lap } = pane;
  const playable = sessionIsPlayable(session.status);
  const videoUrl = playable ? sessionVideoUrl(session.id) : "";

  return (
    <div className={`compare-pane ${frozen ? "compare-pane--frozen" : ""}`}>
      <div className="compare-pane-header">
        {session.title} · Lap {lap.lapNumber} · {formatLapTime(lap.lapTimeMs)}
        {frozen && <span className="compare-pane-frozen-badge">Frozen</span>}
        {!playable && (
          <span className="compare-pane-frozen-badge">Unavailable</span>
        )}
      </div>
      {playable ? (
        <video
          ref={videoRef}
          className="compare-pane-video"
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="compare-pane-unavailable">
          Video file is missing or not ready.
        </div>
      )}
    </div>
  );
}
