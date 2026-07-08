# Video Library & Intake Tracking

Design for tracking videos that have been added to LapViewer, adding new videos from the racing footage drive, and selecting between registered videos in the UI.

Related: [Intake Flow](INTAKE_FLOW.md), [UI Forms](UI_FORMS.md), [Architecture](ARCHITECTURE.md), [Persistence](PERSISTENCE.md), [Features](FEATURES.md).

---

## Purpose

The video library is the app's inventory of known footage. Original GoPro files live in **object storage** (S3 or MinIO); the database stores object keys, metadata, markers, and pointers to derived cache files.

Legacy sessions may still reference paths on a local drive (`storageKind=local_path`).

This lets the Data form show every video that has been added and lets the user select which video/session to open, edit, or compare.

---

## Core model

Use one registered video as one **session** for v1.

```text
GoPro file (object storage)
    -> Session row in SQLite/Postgres
        -> Marker rows
            -> Computed laps
        -> Derived cache files (DATA_DIR/cache/{sessionId}/)
```

### Session record

Draft SQLite shape:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | text | Stable app-generated ID |
| `title` | text | User-facing name; defaults to filename |
| `sourcePath` | text | Legacy absolute path; `s3://{objectKey}` for S3 sessions |
| `sourceRoot` | text | Legacy config root, e.g. `E:\Racing Videos`; `s3` for uploads |
| `relativePath` | text | Legacy path relative to `sourceRoot` |
| `storageKind` | text | `s3` (default for new) or `local_path` (legacy) |
| `objectKey` | text/null | S3 object key, e.g. `users/{userId}/sessions/{id}/{fileName}` |
| `uploadStatus` | text/null | `pending` \| `complete` for S3 sessions |
| `fileName` | text | Original filename, e.g. `GX010012.MP4` |
| `fileSizeBytes` | integer | Size at registration time |
| `fileModifiedAt` | datetime | File modified timestamp at registration |
| `recordedAt` | datetime/null | Session date; user editable, may default from file metadata |
| `trackName` | text/null | Track/event label |
| `notes` | text/null | Freeform notes |
| `camera` | text/null | Default `GoPro` |
| `durationSeconds` | real/null | From probe/browser metadata |
| `videoCodec` | text/null | From probe, e.g. `h264`, `hevc` |
| `width` / `height` | integer/null | From probe |
| `frameRate` | real/null | From probe |
| `status` | text | See status lifecycle below |
| `isPublic` | integer | `0`/`1` — owner-controlled; when `1` and S3 upload complete, other accounts may read ([PUBLIC_SESSIONS_V1.md](features/PUBLIC_SESSIONS_V1.md)) |
| `createdAt` | datetime | First registered in LapViewer |
| `updatedAt` | datetime | Last metadata or status update |

### Marker record

| Field | Type | Purpose |
|-------|------|---------|
| `id` | text | Stable marker ID |
| `sessionId` | text | Parent session |
| `timeSeconds` | real | Position on the video timeline |
| `kind` | text | `lapStart` for v1; later `sessionStart`, `pitIn`, `sector` |
| `label` | text/null | Optional display label |
| `ignored` | integer | When set on a lap-start marker, lap is excluded from counts, compare, and public shared views |
| `createdAt` | datetime | Created timestamp |
| `updatedAt` | datetime | Last edit timestamp |

### Persistence rule

Both session records and marker records are stored in `DATA_DIR/lapviewer.db`. The app must initialize and reuse the same DB file on every startup.

If Docker is used, `DATA_DIR` must be a mounted host directory or named volume. See [Persistence](PERSISTENCE.md).

### Computed lap

Laps do not need their own table in v1. They can be computed from ordered lap-start markers:

```text
Lap 1 = marker[0] -> marker[1]
Lap 2 = marker[1] -> marker[2]
...
```

If we later need manual lap notes, excluded laps, ratings, or favorite flags, add a persisted `laps` table.

---

## Session status lifecycle

The Data form should show whether a video is usable, still processing, or missing.

| Status | Meaning | Data form behavior |
|--------|---------|--------------------|
| `registered` | Path saved, metadata may be incomplete | Show in list; open allowed |
| `probing` | ffprobe/browser metadata check running | Show spinner/status |
| `ready` | Metadata available and video can be opened | Normal state |
| `proxyPending` | Scrub proxy not generated yet | Open allowed; proxy warning |
| `proxyProcessing` | ffmpeg proxy job running | Show progress/status |
| `proxyReady` | Scrub proxy exists | Intake uses proxy |
| `missing` | Original file no longer exists | Show broken-link state; allow relink |
| `error` | Probe/proxy failed | Show error and retry action |

For v1, these can be simplified to `ready`, `processing`, `missing`, and `error` in the UI while keeping more specific internal states available.

---

## Add video workflow

### Primary flow

```text
Data form
  -> Add Video
  -> Intake form
  -> Select file under VIDEO_LIBRARY_ROOT
  -> Enter or confirm metadata
  -> Register session
  -> Probe video
  -> Generate scrub proxy (when ffmpeg is available)
  -> Open marker tools
  -> Nav to Data when finished (new session visible and selected when possible)
```

### Step details

1. **Start from Data form**
   - User clicks `Add Video` or `Add Session`.
   - Opens Intake form in "new session" mode.

2. **Select file**
   - MVP: select one video file.
   - Backend validates the path exists, is readable, and is under `VIDEO_LIBRARY_ROOT`.
   - Backend checks duplicate `sourcePath`.

3. **Confirm metadata**
   - Required for v1: title.
   - Defaults:
     - title = filename without extension
     - camera = `GoPro`
     - date = file modified date until better metadata is available
   - Optional: track name, notes.

4. **Register**
   - Insert session row into SQLite.
   - No video bytes are copied.
   - Data form can immediately show the session.

5. **Probe**
   - Read duration, codec, resolution, frame rate, and audio presence.
   - Update session metadata.
   - If ffprobe is not installed yet, fall back to browser metadata when the video loads.

6. **Proxy/cache**
   - Generate scrub proxy and optional thumbnail in `DATA_DIR/cache/{sessionId}/`.
   - Update proxy status.

7. **Mark laps**
   - User places lap markers on the Intake form.
   - Marker changes persist to SQLite.

8. **Return to Data form**
   - Newly added video remains selected.
   - Lap list shows any markers already entered.

---

## Duplicate handling

Default v1 behavior: **hard block duplicate paths**.

If the selected file has already been added:

- show "This video is already in LapViewer"
- offer `Open existing session`
- do not create a second session row

Later, if we support different edits of the same source video, we can add a "duplicate as new analysis" action, but it is not needed for v1.

---

## Missing and moved files

Because the app stores pointers to files on disk, files can be moved or deleted outside LapViewer.

### Detection

Check existence when:

- loading the Data form
- opening a session
- starting playback
- starting proxy generation

### UI behavior

If missing:

- keep the session row and markers
- show `Missing file` in the Data form
- disable playback/comparison for that session
- offer `Relink file`

Relink should validate that the new file exists and, ideally, has matching size/duration before replacing `sourcePath`.

---

## Data form video section

The Data form needs a dedicated **Videos / Sessions** section that shows every registered video and allows selecting between them.

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Videos                                      [+ Add Video]     │
├──────────────────────────────────────────────────────────────┤
│ Search...  Track [All]  Status [All]  Sort [Newest first]   │
├──────────────────────────────┬───────────────────────────────┤
│ Video list                   │ Selected video details        │
│                              │                               │
│ > 2-19 racing league         │ Title: 2-19 racing league     │
│   GX010012.MP4               │ File: GX010012.MP4            │
│   Ready · 0 markers          │ Duration: 00:00:00 TBD        │
│                              │ Status: Ready                 │
│   GX010013.MP4               │                               │
│   Processing proxy           │ [Open Intake] [Delete]        │
│                              │                               │
│                              │ Laps                          │
│                              │ Empty: Add markers in Intake  │
└──────────────────────────────┴───────────────────────────────┘
```

### Video list fields

Each row/card should show:

- title
- filename
- track/date when available
- status (`Ready`, `Processing`, `Missing`, `Error`)
- lap count
- best lap when markers exist
- optional thumbnail later

### Selection behavior

- Clicking a video selects it and loads details in the right pane.
- The selected video ID is stored in UI state and optionally in the URL, e.g. `/?session=abc123`.
- The right pane shows metadata, actions, and laps for the selected video.
- `Open Intake` opens `/intake/:sessionId`.
- `Compare selected laps` becomes enabled when at least two laps are selected.

### Empty state

When no videos have been added:

```text
No videos added yet.
Add your first GoPro video from E:\Racing Videos.
[Add Video]
```

---

## API endpoints

Draft endpoints for v1:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/sessions` | List added videos/sessions |
| `POST` | `/api/sessions` | Register a new video path |
| `GET` | `/api/sessions/:id` | Get metadata, status, markers, computed laps |
| `PATCH` | `/api/sessions/:id` | Edit title/date/track/notes |
| `DELETE` | `/api/sessions/:id` | Remove from LapViewer (does not delete original file by default) |
| `POST` | `/api/sessions/:id/relink` | Update source path for a missing/moved file |
| `POST` | `/api/sessions/:id/proxy` | Start or retry scrub proxy job |
| `GET` | `/api/sessions/:id/proxy` | Get proxy job status |
| `GET` | `/api/video/:id?variant=original|proxy` | Stream original or proxy with Range support |
| `GET` | `/api/sessions/:id/markers` | List markers |
| `POST` | `/api/sessions/:id/markers` | Add marker |
| `PATCH` | `/api/markers/:markerId` | Move/edit marker |
| `DELETE` | `/api/markers/:markerId` | Delete marker |

---

## Implementation phases

### Phase A: Manual catalog MVP

- SQLite session table.
- Hardcoded `VIDEO_LIBRARY_ROOT`.
- Data form lists registered sessions.
- Intake form registers one file path.
- Clicking a session switches selected video.
- Selected session streams through existing video endpoint.

### Phase B: Metadata and markers

- Persist markers.
- Compute lap list from markers.
- Show lap count and best lap in video list.
- Show selected video's lap table in Data form.

### Phase C: Probe and proxy

- Add ffprobe metadata.
- Add scrub proxy job status.
- Show processing/missing/error states.

### Phase D: Organization

- Track/date filters.
- Search by title, filename, notes.
- Optional thumbnails.
- Optional folder scan under `VIDEO_LIBRARY_ROOT`.

---

## Decisions for v1

| Decision | Draft choice |
|----------|--------------|
| One file or multiple files per session | One file = one session |
| Duplicate paths | Hard block and open existing session |
| Required metadata | Title only; default from filename |
| Original file deletion | Never delete original in v1 |
| Data form default | Video list on left, selected details/laps on right |
| Missing files | Preserve session, show missing state, allow relink later |

