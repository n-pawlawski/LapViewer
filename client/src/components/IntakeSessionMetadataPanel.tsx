import type { Track } from "../api/tracks";

type Props = {
  title: string;
  onTitleChange: (value: string) => void;
  selectedTrackId: string;
  onTrackChange: (trackId: string) => void;
  tracks: Track[];
  trackPlaceholder: string;
  recordedAt: string;
  onRecordedAtChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  saving: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onManageTracks: () => void;
};

export function IntakeSessionMetadataPanel({
  title,
  onTitleChange,
  selectedTrackId,
  onTrackChange,
  tracks,
  trackPlaceholder,
  recordedAt,
  onRecordedAtChange,
  notes,
  onNotesChange,
  saving,
  error,
  onSubmit,
  onManageTracks,
}: Props) {
  return (
    <form className="intake-form intake-form--side-panel" onSubmit={onSubmit}>
      <label className="intake-field">
        <span>Title</span>
        <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)} />
      </label>

      <div className="intake-field">
        <span>Track</span>
        <div className="field-with-action field-with-action--stacked">
          <select
            className="intake-select"
            value={selectedTrackId}
            onChange={(e) => onTrackChange(e.target.value)}
            disabled={saving}
          >
            <option value={trackPlaceholder}>------ select track ------</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onManageTracks}
            disabled={saving}
          >
            Manage tracks
          </button>
        </div>
      </div>

      <label className="intake-field">
        <span>Date</span>
        <input
          type="date"
          value={recordedAt}
          onChange={(e) => onRecordedAtChange(e.target.value)}
        />
      </label>

      <label className="intake-field">
        <span>Notes</span>
        <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={4} />
      </label>

      {error && <p className="data-status data-status--error">{error}</p>}

      <div className="intake-actions intake-actions--side-panel">
        <button type="submit" className="btn btn-secondary" disabled={saving}>
          {saving ? "Saving…" : "Save metadata"}
        </button>
      </div>
    </form>
  );
}
