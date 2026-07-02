import { useCallback, useEffect, useState } from "react";
import {
  createTrack,
  deleteTrack,
  fetchTrack,
  fetchTracks,
  replaceTrackSplits,
  updateTrack,
  type Track,
} from "../api/tracks";
import { pickFolder } from "../api/system";
import { AppShell } from "../components/AppShell";
import { useRouter } from "../lib/router";

interface SplitDraft {
  key: string;
  name: string;
}

function newSplitDraft(name = ""): SplitDraft {
  return { key: crypto.randomUUID(), name };
}

export function TracksPage() {
  const { navigate } = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [videoFolder, setVideoFolder] = useState("");
  const [notes, setNotes] = useState("");
  const [splitDrafts, setSplitDrafts] = useState<SplitDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [browsingFolder, setBrowsingFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const loadTracks = useCallback(async () => {
    const list = await fetchTracks();
    setTracks(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadTracks()
      .then((list) => {
        if (cancelled) return;
        if (list.length > 0) {
          setSelectedId((prev) => prev ?? list[0].id);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tracks");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadTracks]);

  useEffect(() => {
    if (!selectedId || isNew) return;
    let cancelled = false;
    setError(null);
    void fetchTrack(selectedId)
      .then((track) => {
        if (cancelled) return;
        setName(track.name);
        setVideoFolder(track.videoFolder ?? "");
        setNotes(track.notes ?? "");
        setSplitDrafts(
          (track.splits ?? []).map((split) => newSplitDraft(split.name)),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load track");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, isNew]);

  function startNewTrack() {
    setIsNew(true);
    setSelectedId(null);
    setName("");
    setVideoFolder("");
    setNotes("");
    setSplitDrafts([]);
    setError(null);
  }

  function selectTrack(trackId: string) {
    setIsNew(false);
    setSelectedId(trackId);
    setError(null);
  }

  async function handleBrowseFolder() {
    setBrowsingFolder(true);
    try {
      const picked = await pickFolder({
        trackId: selectedId ?? undefined,
        initialDir: videoFolder.trim() || undefined,
      });
      if (picked) setVideoFolder(picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open folder picker");
    } finally {
      setBrowsingFolder(false);
    }
  }

  function addSplitRow() {
    setSplitDrafts((prev) => [...prev, newSplitDraft(`Split ${prev.length + 1}`)]);
  }

  function removeSplitRow(key: string) {
    setSplitDrafts((prev) => prev.filter((row) => row.key !== key));
  }

  function moveSplitRow(key: string, direction: -1 | 1) {
    setSplitDrafts((prev) => {
      const index = prev.findIndex((row) => row.key === key);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        videoFolder: videoFolder.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      let track: Track;
      if (isNew) {
        track = await createTrack(payload);
        setIsNew(false);
        setSelectedId(track.id);
      } else if (selectedId) {
        track = await updateTrack(selectedId, payload);
      } else {
        return;
      }

      const result = await replaceTrackSplits(
        track.id,
        splitDrafts.map((row) => ({ name: row.name.trim() })),
      );
      setSplitDrafts(result.splits.map((split) => newSplitDraft(split.name)));
      const list = await loadTracks();
      setTracks(list);
      setSelectedId(track.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || isNew) return;
    if (!window.confirm(`Delete track "${name}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTrack(selectedId);
      const list = await loadTracks();
      setTracks(list);
      if (list.length > 0) {
        setIsNew(false);
        setSelectedId(list[0].id);
      } else {
        startNewTrack();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  const showEditor = isNew || selectedId != null;

  return (
    <AppShell>
      <div className="data-page tracks-page">
        <div className="data-toolbar">
          <p className="data-toolbar-note">
            Define tracks and their split layout. Every lap on that track uses the same named
            splits.
          </p>
        </div>

        {loading ? (
          <p className="data-status">Loading tracks…</p>
        ) : (
          <div className="data-panes">
            <aside className="data-pane-left">
              <div className="tracks-list-header">
                <h2 className="pane-title">Tracks</h2>
                <button type="button" className="btn btn-secondary btn-sm" onClick={startNewTrack}>
                  + Add
                </button>
              </div>
              <ul className="tracks-list">
                {tracks.map((track) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      className={`tracks-list-item ${
                        selectedId === track.id && !isNew ? "tracks-list-item--active" : ""
                      }`}
                      onClick={() => selectTrack(track.id)}
                    >
                      <span className="tracks-list-name">{track.name}</span>
                      <span className="tracks-list-meta">
                        {track.splitCount} split{track.splitCount === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <section className="data-pane-right">
              {!showEditor ? (
                <p className="data-status">Add a track to get started.</p>
              ) : (
                <form className="tracks-editor" onSubmit={handleSave}>
                  <h2 className="pane-title">{isNew ? "New track" : "Edit track"}</h2>

                  <label className="intake-field">
                    <span>Track name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
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
                  </label>

                  <label className="intake-field">
                    <span>Notes</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </label>

                  <section className="tracks-splits-section">
                    <div className="tracks-splits-header">
                      <h3 className="tracks-splits-title">Splits</h3>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={addSplitRow}
                        disabled={saving}
                      >
                        + Add split
                      </button>
                    </div>
                    <p className="field-hint tracks-splits-hint">
                      Order matters — split 1 is first on track, split 2 is next, and so on. These
                      names appear on every lap during intake.
                    </p>
                    {splitDrafts.length === 0 ? (
                      <p className="intake-empty-hint">No splits yet. Add at least one split.</p>
                    ) : (
                      <ul className="tracks-splits-list">
                        {splitDrafts.map((row, index) => (
                          <li key={row.key} className="tracks-split-row">
                            <span className="tracks-split-index">s{index + 1}</span>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                setSplitDrafts((prev) =>
                                  prev.map((item) =>
                                    item.key === row.key
                                      ? { ...item, name: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="Split name"
                              required
                            />
                            <div className="tracks-split-actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => moveSplitRow(row.key, -1)}
                                disabled={index === 0 || saving}
                                aria-label="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => moveSplitRow(row.key, 1)}
                                disabled={index === splitDrafts.length - 1 || saving}
                                aria-label="Move down"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => removeSplitRow(row.key)}
                                disabled={saving}
                              >
                                Del
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {error && <p className="data-status data-status--error">{error}</p>}

                  <div className="tracks-editor-actions">
                    {!isNew && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={saving}
                      >
                        Delete track
                      </button>
                    )}
                    <div className="modal-actions-right">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate("/intake")}
                      >
                        Back to Intake
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving…" : "Save track"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
