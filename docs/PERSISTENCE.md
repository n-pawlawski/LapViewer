# Persistence Design

LapViewer must persist added videos, metadata, lap markers, and cached processing outputs between browser refreshes, app restarts, PC reboots, and Docker/container rebuilds.

Related: [Architecture](ARCHITECTURE.md), [Video Library](VIDEO_LIBRARY.md), [Features F6](FEATURES.md#f6--data--persistence).

---

## Persistence requirement

The app is not considered usable until these survive restart:

- registered videos/sessions
- video metadata (title, track, date, notes, file path, probe data)
- lap markers
- computed lap availability from markers
- proxy job status
- scrub proxy/cache files when generated

The current hardcoded playback spike does **not** meet this yet. Phase A of the catalog MVP must add the SQLite database before we treat intake as real.

---

## Storage layout

| Data | Location | Persistent? | Notes |
|------|----------|-------------|-------|
| Original GoPro videos | `VIDEO_LIBRARY_ROOT`, e.g. `E:\Racing Videos` | Yes | User-owned footage; app references paths only |
| SQLite database | `DATA_DIR/lapviewer.db` | Yes | Source of truth for sessions and markers |
| Scrub proxies | `DATA_DIR/cache/{sessionId}/scrub.mp4` | Yes, but rebuildable | Can be deleted and regenerated |
| Thumbnails | `DATA_DIR/cache/{sessionId}/thumbnail.jpg` | Yes, but rebuildable | Optional |
| Runtime logs/temp | `DATA_DIR/logs` or OS temp | Not critical | Safe to rotate/delete |

`DATA_DIR` must never point inside `node_modules`, a build output folder, or an unmounted Docker container filesystem.

---

## Database choice

Use **SQLite** for v1.

Why:

- single-user local app
- simple backup: copy one DB file plus cache if desired
- enough for sessions, markers, and metadata
- works both native and Docker
- avoids running a separate database service

We do **not** need Postgres unless the project becomes multi-user, cloud-hosted, or accessed concurrently by many clients.

---

## Minimum durable schema

### `users`

Account records for session and track ownership ([USERS_V1](features/USERS_V1.md)).

| Column | Purpose |
|--------|---------|
| `id` | UUID primary key |
| `email` | Unique login identifier |
| `displayName` | Shown in header |
| `passwordHash` | Null for dev-only user in Phase 1 |
| `role` | e.g. `user` |
| `createdAt` | ISO timestamp |

### `sessions`

Persists every video added to LapViewer.

| Column | Purpose |
|--------|---------|
| `id` | Stable session ID |
| `userId` | Owner (`users.id`) — all queries filter by this |
| `title` | Display name |
| `sourcePath` | Absolute path to original video in native mode, or container path in Docker mode |
| `sourceRoot` | Root used when registered |
| `fileName` | Original filename |
| `fileSizeBytes` | Used for duplicate/missing/relink checks |
| `fileModifiedAt` | Used for identification and sorting |
| `recordedAt` | User-facing session date |
| `trackName` | Organization/filtering |
| `notes` | User notes |
| `camera` | Default `GoPro` |
| `durationSeconds` | Probe/browser metadata |
| `videoCodec` | Probe metadata |
| `width`, `height`, `frameRate` | Probe metadata |
| `status` | `ready`, `processing`, `missing`, `error`, etc. |
| `createdAt`, `updatedAt` | Audit timestamps |

### `markers`

Persists lap markers.

| Column | Purpose |
|--------|---------|
| `id` | Stable marker ID |
| `sessionId` | Parent session |
| `timeSeconds` | Marker position |
| `kind` | `lapStart` for v1 |
| `label` | Optional |
| `createdAt`, `updatedAt` | Audit timestamps |

### Optional later: `settings`

Persists app-wide config if we want it editable from the UI.

| Key | Example |
|-----|---------|
| `videoLibraryRoot` | `E:\Racing Videos` |
| `defaultFrameRate` | `30` |
| `theme` | `dark` |

For v1, environment variables are enough; no settings table required.

### `tracks` and `track_splits`

Track catalog for organizing sessions and defining per-track split definitions. Tracks are **per-user** (`userId` FK, `UNIQUE(userId, name)`). See server schema in `server/src/db/database.ts`.

**Migration (Phase 1):** Existing rows without `userId` are backfilled to the dev user when `LAPVIEWER_DEV_USER=1` or `NODE_ENV=development`. Without dev mode, startup fails if orphan rows exist — delete `data/lapviewer.db` or run once in dev mode.

### `detection_profiles` (assisted lap detection)

One profile per track layout (1:1 with `tracks`). Stores the landmark ROI and detection tuning parameters used by assisted lap detection ([AUTO_LAP_DETECTION_V1](features/AUTO_LAP_DETECTION_V1.md)).

| Column | Purpose |
|--------|---------|
| `id` | Stable profile ID |
| `trackId` | Parent track (unique — one profile per track) |
| `roiX0`, `roiY0`, `roiX1`, `roiY1` | Normalized landmark box (0..1); null until calibrated |
| `scanFps` | Frame sampling rate for detection scans (default 5) |
| `lapTimePriorMs` | Optional lap-time seed for period estimation |
| `createdAt`, `updatedAt` | Audit timestamps |

Deleting a track cascades to its detection profile.

### `detection_bank` (assisted lap detection)

Growing template bank of confirmed lap-start ROIs per profile. Hybrid storage: provenance (source session + time + ROI used) plus a cached grayscale blob for fast NCC matching.

| Column | Purpose |
|--------|---------|
| `id` | Stable bank entry ID |
| `profileId` | Parent detection profile |
| `sourceSessionId` | Session where this template was confirmed |
| `timeSeconds` | Confirmed start time in source video |
| `roiX0`..`roiY1` | ROI box used when the template was captured |
| `roiGray` | Cached grayscale ROI vector (BLOB) |
| `confirmedAt`, `createdAt` | Timestamps |

Deleting a detection profile cascades to its bank entries. Bank entries are **not** deleted when a source session is removed (provenance may become stale; cached blob remains usable).

Access layer: `server/src/services/detectionProfiles.ts`.

### Reference-lap detection (Phase 3B)

Proposed schema for [GOPRO_LAP_SPLIT_DETECTION](features/GOPRO_LAP_SPLIT_DETECTION.md) — **M2-LV migrated** (2026-07-06). Decisions D-019–D-024.

#### `track_reference_profiles`

One row per track (1:1 with `tracks`, CASCADE on track delete). Stores reference lap bounds, crop, and sequence-alignment tunables.

| Column | Purpose |
|--------|---------|
| `id` | Stable profile ID |
| `trackId` | Parent track (UNIQUE) |
| `referenceSessionId` | Session containing reference lap |
| `referenceLapNumber` | Lap number used as reference (1-based) |
| `referenceStartMarkerId` | Optional FK → `markers.id` |
| `referenceEndMarkerId` | Optional FK → end boundary marker |
| `cropTop`, `cropBottom`, `cropLeft`, `cropRight` | Normalized crop (0..1) |
| `direction` | `clockwise` \| `counterclockwise` \| `unknown` |
| `scanFps` | Sample rate for matching (default 5) |
| `minLapTimeMs`, `maxProgressJumpPerSec` | Sequence alignment |
| `lapBoundaryConfidenceMin`, `splitConfidenceMin` | Review thresholds |
| `createdAt`, `updatedAt` | Audit |

#### `track_reference_points`

Visual fingerprints sampled along the reference lap.

| Column | Purpose |
|--------|---------|
| `id` | Stable point ID |
| `profileId` | FK → `track_reference_profiles` |
| `timestampMs` | Time in reference video |
| `progress` | 0.0–1.0 on reference lap |
| `featurePath` | Path under `DATA_DIR/cache/features/` |
| `perceptualHash` | Optional pHash |
| `createdAt` | Audit |

#### `track_splits.progress`

Add nullable `progress REAL` to existing `track_splits` — canonical split position on reference lap (0..1). **Migrated.** Session split markers remain timestamp-based instances.

#### Cache layout

```text
DATA_DIR/cache/features/{profileId}/
  {pointId}.raw          # grayscale crop bytes (NCC)
DATA_DIR/cache/{trackId}/
  ref-build-{profileId}/ # reference lap scan frames
  match-scan/            # session match scan frames
```

Match-job frame caches follow existing `lap-detect-fps*` pattern; not stored in SQLite except debug exports. **`track_reference_points` migrated.**

---

## Native local persistence

Recommended native layout:

```text
LapViewer/
├── data/
│   ├── lapviewer.db
│   └── cache/
└── ...

E:\Racing Videos\
└── 2-19 racing league\
    ├── GX010012.MP4
    └── ...
```

Environment:

```text
DATA_DIR=./data
VIDEO_LIBRARY_ROOT=E:\Racing Videos
```

Persistence behavior:

- app restart: survives
- browser refresh: survives
- PC reboot: survives
- reinstall in same repo: survives if `data/` is kept
- moving original videos: session remains, but status becomes `missing` until relinked

---

## Docker persistence

Docker can work well if we define volumes correctly. Without volumes, Docker will **lose data** when containers are removed.

### Required mounts

```yaml
services:
  lapviewer:
    volumes:
      - ./data:/app/data
      - "E:/Racing Videos:/videos:ro"
    environment:
      DATA_DIR: /app/data
      VIDEO_LIBRARY_ROOT: /videos
```

| Mount | Purpose |
|-------|---------|
| `./data:/app/data` | Persists SQLite DB and cache on the host |
| `E:/Racing Videos:/videos:ro` | Lets the container read original videos without copying them |

Use read-only (`:ro`) for the video mount in v1 because LapViewer should not alter original footage.

### Path implication

In native mode a session may store:

```text
E:\Racing Videos\2-19 racing league\GX010012.MP4
```

In Docker mode the backend sees:

```text
/videos/2-19 racing league/GX010012.MP4
```

To avoid future pain, store both:

- `sourcePath`: backend-readable path at registration time
- `sourceRoot`: configured root at registration time
- `relativePath`: path relative to the root, e.g. `2-19 racing league/GX010012.MP4`

Then the app can rebuild the runtime path if we switch from native to Docker later.

Recommended v1 session path fields:

| Field | Example native | Example Docker |
|-------|----------------|----------------|
| `sourceRoot` | `E:\Racing Videos` | `/videos` |
| `relativePath` | `2-19 racing league\GX010012.MP4` | `2-19 racing league/GX010012.MP4` |
| `sourcePath` | `E:\Racing Videos\...\GX010012.MP4` | `/videos/.../GX010012.MP4` |

`relativePath` is the important addition if Docker may become first-class.

---

## Backup strategy

Minimum backup:

1. Copy `DATA_DIR/lapviewer.db`
2. Keep original videos in `VIDEO_LIBRARY_ROOT`

Optional full backup:

1. Copy all of `DATA_DIR/`
2. Keep/copy original video drive separately

Scrub proxies are rebuildable, but backing up `DATA_DIR/cache` avoids reprocessing.

---

## Delete behavior

Default v1 behavior:

- deleting a session removes the SQLite session row and markers
- deleting a session may remove derived cache files
- deleting a session **does not delete the original video**

Original deletion should require a separate explicit future feature with extra confirmation.

---

## Implementation requirement for the next phase

Before expanding intake UI, implement:

- SQLite initialization at server startup
- `DATA_DIR` creation if missing
- `sessions` table
- `markers` table
- `GET /api/sessions`
- `POST /api/sessions`
- Data form list populated from SQLite

That is the point where added videos begin persisting between sessions.

