import { useEffect, useState } from "react";
import {
  createTrack,
  deleteTrack,
  updateTrack,
  type Track,
} from "../api/tracks";
import { pickFolder } from "../api/system";
import { Modal } from "./Modal";

interface TrackModalProps {
  open: boolean;
  mode: "add" | "edit";
  track: Track | null;
  onClose: () => void;
  onSaved: (track: Track) => void;
  onDeleted?: (trackId: string) => void;
}

export function TrackModal({
  open,
  mode,
  track,
  onClose,
  onSaved,
  onDeleted,
}: TrackModalProps) {
  const [name, setName] = useState("");
  const [videoFolder, setVideoFolder] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [browsingFolder, setBrowsingFolder] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(track?.name ?? "");
    setVideoFolder(track?.videoFolder ?? "");
    setNotes(track?.notes ?? "");
    setError(null);
  }, [open, track]);

  async function handleBrowseFolder() {
    setError(null);
    setBrowsingFolder(true);
    try {
      const picked = await pickFolder({
        trackId: track?.id,
        initialDir: videoFolder.trim() || undefined,
      });
      if (picked) {
        setVideoFolder(picked);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open folder picker");
    } finally {
      setBrowsingFolder(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        videoFolder: videoFolder.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const saved =
        mode === "edit" && track
          ? await updateTrack(track.id, payload)
          : await createTrack(payload);

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!track || !onDeleted) return;
    if (!window.confirm(`Delete track "${track.name}"?`)) return;

    setError(null);
    setSaving(true);
    try {
      await deleteTrack(track.id);
      onDeleted(track.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={mode === "add" ? "Add track" : "Edit track"}
      onClose={onClose}
    >
      <form className="track-modal-form" onSubmit={handleSubmit}>
        <label className="intake-field">
          <span>Track name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pacific Raceways"
            required
            autoFocus
          />
        </label>

        <label className="intake-field">
          <span>Default video folder</span>
          <div className="field-with-action">
            <input
              type="text"
              value={videoFolder}
              onChange={(e) => setVideoFolder(e.target.value)}
              placeholder="E:\Racing Videos\..."
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleBrowseFolder}
              disabled={browsingFolder || saving}
            >
              {browsingFolder ? "…" : "Browse"}
            </button>
          </div>
          <span className="field-hint">
            Used as the starting folder when picking videos for this track.
          </span>
        </label>

        <label className="intake-field">
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Layout notes, direction, surface, etc."
          />
        </label>

        {error && <p className="data-status data-status--error">{error}</p>}

        <div className="modal-actions">
          {mode === "edit" && onDeleted && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
          <div className="modal-actions-right">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : mode === "add" ? "Add track" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
