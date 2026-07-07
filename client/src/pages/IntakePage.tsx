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
import { IntakeSessionMetadataPanel } from "../components/IntakeSessionMetadataPanel";
import { IntakeUploadZone } from "../components/IntakeUploadZone";
import { isValidMp4File } from "../utils/videoFileValidation";
import { useRouter, useSearchParams } from "../lib/router";
import { setSelectedSessionId } from "../lib/selectedSession";

const TRACK_PLACEHOLDER = "";

export function IntakePage() {
  const { navigate } = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const isMarkingMode = Boolean(sessionId);

  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [title, setTitle] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState(TRACK_PLACEHOLDER);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [recordedAt, setRecordedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isMarkingMode);
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
        if (sessionId) {
          const [trackList, session] = await Promise.all([
            fetchTracks(),
            fetchSession(sessionId),
          ]);
          if (cancelled) return;
          setTracks(trackList);
          setSelectedSessionId(sessionId);
          applySessionToForm(session, trackList);
        } else {
          const storageConfig = await fetchStorageConfig().catch(() => ({
            storageBackend: "local_objects" as const,
            uploadEnabled: true,
            uploadMode: "direct" as const,
            s3UploadEnabled: true,
          }));
          if (cancelled) return;
          setUploadMode(storageConfig.uploadMode ?? "direct");
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
    setSaving(true);

    const payload = {
      title: title.trim() || undefined,
      trackName: selectedTrack?.name ?? null,
      recordedAt: recordedAt || null,
      notes: notes.trim() || null,
    };

    try {
      if (sessionId) {
        const session = await updateSession(sessionId, payload);
        applySessionToForm(session, tracks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    setError(null);

    if (!uploadFile || !isValidMp4File(uploadFile)) {
      setError("Choose a valid MP4 file before uploading.");
      return;
    }

    setSaving(true);
    setUploadProgress(0);

    const titleFromFile = uploadFile.name.replace(/\.[^.]+$/i, "");
    const metadata = {
      title: titleFromFile || undefined,
    };

    try {
      if (uploadMode === "presigned") {
        const { sessionId: newId, uploadUrl } = await requestUploadUrl({
          fileName: uploadFile.name,
          ...metadata,
          contentType: uploadFile.type || "video/mp4",
        });
        await uploadFileToPresignedUrl(uploadUrl, uploadFile, setUploadProgress);
        const session = await completeUpload(newId);
        setUploadProgress(null);
        setSelectedSessionId(newId);
        navigate(`/intake?session=${newId}`);
        applySessionToForm(session, tracks);
      } else {
        const session = await uploadSessionFile(uploadFile, metadata, setUploadProgress);
        setUploadProgress(null);
        setSelectedSessionId(session.id);
        navigate(`/intake?session=${session.id}`);
      }
    } catch (err) {
      setUploadProgress(null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  const canUpload = uploadFile !== null && isValidMp4File(uploadFile) && !saving;

  if (loading) {
    return (
      <AppShell layout="intake-workstation">
        <div className="intake-page">
          <p className="data-status">Loading session…</p>
        </div>
      </AppShell>
    );
  }

  const pageClass = isMarkingMode
    ? "intake-page intake-page--workstation"
    : "intake-page intake-page--upload";

  return (
    <AppShell layout={isMarkingMode ? "intake-workstation" : "default"}>
      <div className={pageClass}>
        {isMarkingMode && sessionDetail && sessionId ? (
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
            sessionMetadataPanel={
              <IntakeSessionMetadataPanel
                title={title}
                onTitleChange={setTitle}
                selectedTrackId={selectedTrackId}
                onTrackChange={setSelectedTrackId}
                tracks={tracks}
                trackPlaceholder={TRACK_PLACEHOLDER}
                recordedAt={recordedAt}
                onRecordedAtChange={setRecordedAt}
                notes={notes}
                onNotesChange={setNotes}
                saving={saving}
                error={error}
                onSubmit={handleMetadataSubmit}
                onManageTracks={() => navigate("/tracks")}
              />
            }
          />
        ) : (
          <>
            <h1>Add session</h1>
            <p className="intake-lead">
              Drop a GoPro MP4 here or browse for a file, then upload when ready.
            </p>

            <IntakeUploadZone
              file={uploadFile}
              disabled={saving}
              onFileChange={setUploadFile}
            />

            {uploadProgress !== null && (
              <div className="intake-upload-progress" aria-live="polite">
                <div
                  className="intake-upload-progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
                <span className="intake-upload-progress-label">
                  Uploading… {uploadProgress}%
                </span>
              </div>
            )}

            {error && <p className="data-status data-status--error">{error}</p>}

            <div className="intake-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canUpload}
                onClick={() => void handleUpload()}
              >
                {saving ? `Uploading… ${uploadProgress ?? 0}%` : "Upload"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/")}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
