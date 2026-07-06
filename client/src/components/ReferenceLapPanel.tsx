import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchReferenceProfile,
  saveReferenceProfile,
  type ReferenceProfile,
} from "../api/referenceProfile";
import type { SessionDetail } from "../api/sessions";
import type { TrackSplit } from "../api/tracks";
import { TrackMatchPanel } from "./TrackMatchPanel";
import type { Lap, Marker, Split } from "../types";
import { formatVideoTime } from "../utils/time";
import { lapBounds, splitsByLapNumber } from "../utils/splits";

interface ReferenceLapPanelProps {
  sessionId: string;
  trackId: string;
  markers: Marker[];
  splits: Split[];
  laps: Lap[];
  trackSplits: TrackSplit[];
  durationSeconds: number;
  onProfileSaved: (profile: ReferenceProfile) => void;
  onSessionUpdated: (session: SessionDetail) => void;
  onSeek: (timeSeconds: number) => void;
}

function previewSplitProgress(
  lapNumber: number,
  splits: Split[],
  laps: Lap[],
  trackSplits: TrackSplit[],
): Array<{ splitIndex: number; name: string; progress: number | null }> {
  const bounds = lapBounds(laps, lapNumber);
  if (!bounds) return [];
  const duration = bounds.endSeconds - bounds.startSeconds;
  if (duration <= 0) return [];

  const splitMap = splitsByLapNumber(splits);
  const lapSplits = splitMap.get(lapNumber) ?? [];

  return trackSplits.map((trackSplit) => {
    const split = lapSplits.find((s) => s.splitIndex === trackSplit.splitIndex);
    if (!split) {
      return { splitIndex: trackSplit.splitIndex, name: trackSplit.name, progress: null };
    }
    return {
      splitIndex: trackSplit.splitIndex,
      name: trackSplit.name,
      progress: Math.min(1, Math.max(0, (split.timeSeconds - bounds.startSeconds) / duration)),
    };
  });
}

export function ReferenceLapPanel({
  sessionId,
  trackId,
  markers,
  splits,
  laps,
  trackSplits,
  durationSeconds,
  onProfileSaved,
  onSessionUpdated,
  onSeek,
}: ReferenceLapPanelProps) {
  const [profile, setProfile] = useState<ReferenceProfile | null>(null);
  const [lapNumber, setLapNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchReferenceProfile(trackId)
      .then((existing) => {
        if (cancelled) return;
        setProfile(existing);
        if (existing?.referenceSessionId === sessionId) {
          setLapNumber(existing.referenceLapNumber);
        } else {
          setLapNumber(1);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load reference profile");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trackId, sessionId]);

  const bounds = useMemo(() => lapBounds(laps, lapNumber), [laps, lapNumber]);
  const splitPreview = useMemo(
    () => previewSplitProgress(lapNumber, splits, laps, trackSplits),
    [lapNumber, splits, laps, trackSplits],
  );

  const canSave =
    markers.length >= lapNumber &&
    bounds != null &&
    bounds.endSeconds > bounds.startSeconds + 0.5;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveReferenceProfile(trackId, {
        referenceSessionId: sessionId,
        referenceLapNumber: lapNumber,
      });
      setProfile(saved);
      setSavedAt(new Date().toLocaleTimeString());
      onProfileSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reference profile");
    } finally {
      setSaving(false);
    }
  }, [canSave, trackId, sessionId, lapNumber, onProfileSaved]);

  if (loading) {
    return <p className="intake-empty-hint">Loading reference profile…</p>;
  }

  if (markers.length === 0) {
    return (
      <p className="intake-empty-hint">
        Mark at least one lap start before defining a reference lap for this track.
      </p>
    );
  }

  return (
    <div className="reference-lap-panel">
      <p className="reference-lap-panel-intro">
        Pick a clean lap on this session as the track reference. Split positions are saved as{" "}
        <strong>progress</strong> (0–100%) on the lap, reusable across future videos.
      </p>

      {profile?.referenceSessionId === sessionId && (
        <p className="data-status data-status--ok reference-lap-saved-hint">
          Saved reference: Lap {profile.referenceLapNumber} (
          {formatVideoTime(profile.referenceStartSeconds)} –{" "}
          {formatVideoTime(profile.referenceEndSeconds)})
        </p>
      )}

      <label className="reference-lap-field">
        <span>Reference lap</span>
        <select
          value={lapNumber}
          onChange={(e) => setLapNumber(Number(e.target.value))}
        >
          {markers.map((_, index) => (
            <option key={markers[index]!.id} value={index + 1}>
              Lap {index + 1} @ {formatVideoTime(markers[index]!.timeSeconds)}
            </option>
          ))}
        </select>
      </label>

      {bounds && (
        <dl className="reference-lap-bounds">
          <div>
            <dt>Start</dt>
            <dd>{formatVideoTime(bounds.startSeconds)}</dd>
          </div>
          <div>
            <dt>End</dt>
            <dd>{formatVideoTime(bounds.endSeconds)}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{formatVideoTime(bounds.endSeconds - bounds.startSeconds)}</dd>
          </div>
        </dl>
      )}

      {trackSplits.length === 0 ? (
        <p className="data-status data-status--warn">
          Configure split names on the <strong>Tracks</strong> page, then mark splits on the
          reference lap before saving.
        </p>
      ) : (
        <table className="intake-marker-table reference-lap-splits-table">
          <thead>
            <tr>
              <th>Split</th>
              <th>On lap</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {splitPreview.map((row) => (
              <tr key={row.splitIndex}>
                <td>{row.name}</td>
                <td>
                  {row.progress != null
                    ? formatVideoTime(
                        bounds!.startSeconds +
                          row.progress * (bounds!.endSeconds - bounds!.startSeconds),
                      )
                    : "—"}
                </td>
                <td>{row.progress != null ? `${(row.progress * 100).toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p className="data-status data-status--error">{error}</p>}
      {savedAt && !error && (
        <p className="data-status data-status--ok">Saved at {savedAt}</p>
      )}

      <button
        type="button"
        className="btn btn-primary reference-lap-save"
        onClick={() => void handleSave()}
        disabled={!canSave || saving}
        title={
          canSave
            ? "Persist reference lap bounds and split progress on the track"
            : "Need lap bounds (mark the next lap start or set duration)"
        }
      >
        {saving ? "Saving…" : "Save reference profile"}
      </button>

      <TrackMatchPanel
        sessionId={sessionId}
        trackId={trackId}
        profile={profile}
        durationSeconds={durationSeconds}
        onProfileUpdated={setProfile}
        onSessionUpdated={onSessionUpdated}
        onSeek={onSeek}
      />
    </div>
  );
}
