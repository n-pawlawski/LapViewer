import { useCallback, useEffect, useState } from "react";
import {
  fetchSession,
  updateSession,
  type SessionDetail,
} from "../api/sessions";
import {
  completeUpload,
  fetchStorageConfig,
  requestUploadUrl,
  uploadFileToPresignedUrl,
  uploadSessionFile,
} from "../api/upload";
import { fetchTracks, fetchTrack, type Track, type TrackSplit } from "../api/tracks";
import { AppShell } from "../components/AppShell";
import { IntakeMarkingPanel } from "../components/IntakeMarkingPanel";
import { useRouter, useSearchParams } from "../lib/router";
import { setSelectedSessionId } from "../lib/selectedSession";

const TRACK_PLACEHOLDER = "";

export function IntakePage() {
  const { navigate } = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const isEditMode = Boolean(sessionId);

  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [title, setTitle] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState(TRACK_PLACEHOLDER);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [recordedAt, setRecordedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [metadataOpen, setMetadataOpen] = useState(!isEditMode);
  const [trackSplits, setTrackSplits] = useState<TrackSplit[]>([]);
  const [uploadMode, setUploadMode] = useState<"direct" | "presigned">("direct");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const applySessionToForm = useCallback((session: SessionDetail, trackList: Track[]) => {
    setSessionDetail(session);
    setTitle(session.title);
    setRecordedAt(session.date ?? "");
    setNotes(session.notes ?? "");
    const track = trackList.find((item) => item.name === session.track);
    setSelectedTrackId(track?.id ?? TRACK_PLACEHOLDER);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [trackList, storageConfig] = await Promise.all([
          fetchTracks(),
          fetchStorageConfig().catch(() => ({
            storageBackend: "local_objects" as const,
            uploadEnabled: true,
            uploadMode: "direct" as const,
            s3UploadEnabled: true,
          })),
        ]);
        if (cancelled) return;
        setTracks(trackList);
        setUploadMode(storageConfig.uploadMode ?? "direct");

        if (sessionId) {
          const session = await fetchSession(sessionId);
          if (cancelled) return;
          setSelectedSessionId(sessionId);
          applySessionToForm(session, trackList);
          setMetadataOpen(false);
        } else {
          setSessionDetail(null);
          setTitle("");
          setSelectedTrackId(TRACK_PLACEHOLDER);
          setRecordedAt("");
          setNotes("");
          setMetadataOpen(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load intake");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, applySessionToForm]);

  const selectedTrack =
    tracks.find((track) => track.id === selectedTrackId) ?? null;

  useEffect(() => {
    if (!selectedTrackId) {
      setTrackSplits([]);
      return;
    }
    let cancelled = false;
    void fetchTrack(selectedTrackId)
      .then((track) => {
        if (!cancelled) setTrackSplits(track.splits ?? []);
      })
      .catch(() => {
        if (!cancelled) setTrackSplits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTrackId]);

  const activeTrackSplits =
    sessionDetail?.trackSplits?.length ? sessionDetail.trackSplits : trackSplits;

  const handleSessionUpdated = useCallback(
    (session: SessionDetail) => {
      applySessionToForm(session, tracks);
    },
    [applySessionToForm, tracks],
  );

  async function handleMetadataSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!uploadFile) {
      setError("Choose a video file to upload.");
      return;
    }

    setSaving(true);

    const metadata = {
      title: title.trim() || undefined,
      trackName: selectedTrack?.name ?? null,
      recordedAt: recordedAt || null,
      notes: notes.trim() || null,
    };

    try {
      if (isEditMode && sessionId) {
        const session = await updateSession(sessionId, metadata);
        applySessionToForm(session, tracks);
        setMetadataOpen(false);
      } else if (uploadMode === "presigned") {
        const { sessionId: newId, uploadUrl } = await requestUploadUrl({
          fileName: uploadFile.name,
          ...metadata,
          contentType: uploadFile.type || "video/mp4",
        });
        setUploadProgress(0);
        await uploadFileToPresignedUrl(uploadUrl, uploadFile, setUploadProgress);
        const session = await completeUpload(newId);
        setUploadProgress(null);
        setSelectedSessionId(newId);
        navigate(`/intake?session=${newId}`);
        applySessionToForm(session, tracks);
      } else {
        setUploadProgress(0);
        const session = await uploadSessionFile(uploadFile, metadata, setUploadProgress);
        setUploadProgress(null);
        setSelectedSessionId(session.id);
        navigate(`/intake?session=${session.id}`);
        applySessionToForm(session, tracks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell layout="intake-workstation">
        <div className="intake-page">
          <p className="data-status">Loading session…</p>
        </div>
      </AppShell>
    );
  }

  const pageClass = isEditMode
    ? "intake-page intake-page--workstation"
    : "intake-page";

  return (
    <AppShell layout={isEditMode ? "intake-workstation" : "default"}>
      <div className={pageClass}>
        {isEditMode && sessionDetail && sessionId ? (
          <>
            <details
              className="intake-metadata-details"
              open={metadataOpen}
              onToggle={(e) => setMetadataOpen(e.currentTarget.open)}
            >
              <summary className="intake-metadata-summary">Session metadata</summary>
              <form className="intake-form intake-form--inline" onSubmit={handleMetadataSubmit}>
                <label className="intake-field">
                  <span>Title</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <div className="intake-field">
                  <span>Track</span>
                  <div className="field-with-action">
                    <select
                      className="intake-select"
                      value={selectedTrackId}
                      onChange={(e) => setSelectedTrackId(e.target.value)}
                      disabled={saving}
                    >
                      <option value={TRACK_PLACEHOLDER}>------ select track ------</option>
                      {tracks.map((track) => (
                        <option key={track.id} value={track.id}>
                          {track.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate("/tracks")}
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
                    onChange={(e) => setRecordedAt(e.target.value)}
                  />
                </label>
                <label className="intake-field intake-field--wide">
                  <span>Notes</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </label>
                {error && <p className="data-status data-status--error">{error}</p>}
                <div className="intake-actions">
                  <button type="submit" className="btn btn-secondary" disabled={saving}>
                    {saving ? "Saving…" : "Save metadata"}
                  </button>
                </div>
              </form>
            </details>

            <IntakeMarkingPanel
              sessionId={sessionId}
              sessionTitle={sessionDetail.title}
              status={sessionDetail.status}
              fileName={sessionDetail.fileName}
              durationSeconds={sessionDetail.durationSeconds}
              trackId={selectedTrackId || null}
              markers={sessionDetail.markers}
              splits={sessionDetail.splits ?? []}
              trackSplits={activeTrackSplits}
              laps={sessionDetail.laps}
              onSessionUpdated={handleSessionUpdated}
              onBackToData={() => navigate(`/?session=${sessionId}`)}
            />
          </>
        ) : (
          <>
            <h1>Register session</h1>
            <p className="intake-lead">
              Choose a GoPro video file and upload it, then mark laps.
            </p>

            <form className="intake-form" onSubmit={handleMetadataSubmit}>
              <label className="intake-field">
                <span>Video file</span>
                <input
                  type="file"
                  accept="video/*,.mp4,.MP4,.mov,.MOV"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setUploadFile(file);
                    if (file && !title.trim()) {
                      const baseName = file.name.replace(/\.[^.]+$/, "");
                      if (baseName) setTitle(baseName);
                    }
                  }}
                  required
                />
                {uploadProgress !== null && (
                  <span className="field-hint">Uploading… {uploadProgress}%</span>
                )}
                <span className="field-hint">
                  Large GoPro files are uploaded through the app — no extra storage setup required.
                </span>
              </label>

              <label className="intake-field">
                <span>Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Defaults to filename"
                />
              </label>

              <div className="intake-field">
                <span>Track</span>
                <div className="field-with-action">
                  <select
                    className="intake-select"
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    disabled={saving}
                  >
                    <option value={TRACK_PLACEHOLDER}>------ select track ------</option>
                    {tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate("/tracks")}
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
                  onChange={(e) => setRecordedAt(e.target.value)}
                />
              </label>

              <label className="intake-field">
                <span>Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </label>

              {error && <p className="data-status data-status--error">{error}</p>}

              <div className="intake-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !uploadFile}
                >
                  {saving
                    ? uploadProgress !== null
                      ? `Uploading… ${uploadProgress}%`
                      : "Registering…"
                    : "Register & mark laps"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
