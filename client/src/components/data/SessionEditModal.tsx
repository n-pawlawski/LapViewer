import { useState } from "react";
import { deleteSession, updateSession } from "../../api/sessions";
import { Modal } from "../Modal";

interface SessionEditModalProps {
  open: boolean;
  sessionId: string;
  title: string;
  track: string;
  date: string;
  notes: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  canDelete?: boolean;
}

export function SessionEditModal({
  open,
  sessionId,
  title: initialTitle,
  track: initialTrack,
  date: initialDate,
  notes: initialNotes,
  onClose,
  onSaved,
  onDeleted,
  canDelete = false,
}: SessionEditModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [track, setTrack] = useState(initialTrack);
  const [date, setDate] = useState(initialDate);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateSession(sessionId, {
        title: title.trim() || undefined,
        trackName: track.trim() || null,
        recordedAt: date.trim() || null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteSession(sessionId);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} title="Edit session" onClose={onClose}>
      <form className="session-edit-form" onSubmit={(e) => void handleSave(e)}>
        <label className="form-field">
          <span>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Track</span>
          <input type="text" value={track} onChange={(e) => setTrack(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {canDelete && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete session"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
