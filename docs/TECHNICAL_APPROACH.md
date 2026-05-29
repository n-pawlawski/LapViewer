# Technical Approach

High-level options for building LapViewer. **No decisions are final** — see [Open Questions](OPEN_QUESTIONS.md) for what you need to answer.

---

## Architecture overview

Full detail: **[ARCHITECTURE.md](ARCHITECTURE.md)** — monorepo layout, local vs Docker, runtime modes.

Persistence detail: **[PERSISTENCE.md](PERSISTENCE.md)** — SQLite, `DATA_DIR`, cache, and Docker volume rules.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (client)                       │
│  React + Vite — Data / Intake / Comparison forms          │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP /api + video streams
┌──────────────────────────▼──────────────────────────────┐
│                     Node backend                         │
│  REST · SQLite · ffmpeg jobs · Range file serving        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                     Storage                              │
│  video files (existing drive, paths) · app data/cache    │
└──────────────────────────────────────────────────────────┘
```

**Run model (draft):** Local native on your Windows PC — `npm run dev` while building, `npm start` for daily use. Docker is viable if we mount `DATA_DIR` and the video library from the host; persistence must not depend on container-local storage.

Two viable shapes:

| Model | Best for | Trade-off |
|-------|----------|-----------|
| **Local-first app** | Single machine, large files, privacy | You run a local server; not accessible from other devices unless you expose it |
| **Hosted web app** | Access anywhere, easier sharing later | Video storage cost and upload bandwidth |

Given personal racing footage (often multi-GB), **local-first or self-hosted** is a strong default unless you want cloud access.

---

## Recommended stack (starting point)

These are suggestions to discuss — not locked in.

### Frontend

- **React + TypeScript + Vite** — fast dev, good ecosystem for video UI.
- **Video player:** HTML5 `<video>` element for playback. **Video.js / Plyr** are optional UI skins only — they do **not** fix scrub lag (see [Video playback & scrubbing](#video-playback--scrubbing) below).
- **Timeline/markers:** Custom canvas or DOM overlay on the seek bar (common pattern in NLE-lite tools).
- **Comparison sync:** Multiple `<video>` elements; master clock drives `currentTime` on all panes from computed offsets.

### Video processor

- **ffmpeg** (+ **ffprobe** for metadata) — generate **scrub proxies** and thumbnails; remux if needed. Industry standard, scriptable from the backend on intake.
- Proxies live in **app cache** (not on your video drive); originals stay path-only in the DB.

### Backend

- **Node (Fastify or Express)** — REST API, SQLite, ffmpeg jobs, video streaming with HTTP Range.
- Serves built React static files in local run mode (`npm start`); Vite dev server + API proxy in development.
- See [Architecture](ARCHITECTURE.md) for monorepo layout and runtime modes.

### Database

- **SQLite** — ideal for single-user local app; one file, easy backup.
- **JSON files** — even simpler for MVP if lap count stays low.
- **Postgres** — only if you expect multi-user or hosted SaaS later.

### File storage

**Decision:** Pointer-based library on an existing local drive (see [Open Questions §1.2 / §4.2](OPEN_QUESTIONS.md)).

- Videos remain on your drive; the app does **not** copy them into app-managed storage.
- The database stores an absolute (or root-relative) **file path** per session, plus metadata and lap markers.
- App-owned data (SQLite DB, optional thumbnails/cache) lives in a separate app data location — not mixed with source videos unless you prefer otherwise.
- A configurable **`VIDEO_LIBRARY_ROOT`** (or similar) defines the root directory the app scans or validates paths against.
- Thumbnails/cache may be written to app data; optional sidecar files (e.g. `{video}.lapviewer.json`) are a future option if you want markers portable alongside files.

**Import flow (v1 sketch):**

1. User picks a file from the library drive (file picker or scan).
2. Backend verifies the path exists and is readable.
3. Database row created: `{ id, title, sourcePath, ... }` — no file copy.
4. Video served via local API reading from `sourcePath`.

**Implications:**

- No large upload step — fast "add session" if files are already on disk.
- If a file is moved/deleted outside the app, the session shows a broken-link state until re-pointed.
- Do **not** store video in the database.

### Video processing

**Decision (draft):** Use **ffmpeg** to build a **scrub proxy** per session on intake. Original GoPro files stay on your drive; only a small derived file is written to app cache.

| Asset | Purpose | Location |
|-------|---------|----------|
| **Original** | Full-quality playback, comparison view | Your video drive (path in DB) |
| **Scrub proxy** | Fast seeking while marking laps | App cache, e.g. `data/cache/{sessionId}/scrub.mp4` |
| **Thumbnail** (optional) | Library poster frame | App cache |

**Proxy recipe (starting point):**

- H.264 + AAC in MP4 (broad browser support)
- Lower resolution (480p or 720p — TBD after sample file test)
- **Keyframe every ~1 s** (`-g 30` at 30 fps) so seeks land quickly
- `faststart` / moov at front for range-request seeking
- One-time cost on intake (background job + progress UI)

**Not expected to help scrub lag:** Video.js, Plyr, react-player — these wrap `<video>` UI; the bottleneck is decode + keyframe spacing in the source file.

See [Video playback & scrubbing](#video-playback--scrubbing) for the full rationale.

---

## Key technical challenges

### 1. Large files & import

Race videos can be 1–10+ GB, but with pointer-based storage there is **no copy-on-import**.

| Approach | Notes |
|----------|-------|
| **Register by path** (chosen) | User selects or scans files on the library drive; DB stores path only |
| Browser upload + copy | Not the default — avoids duplicating large files on disk |
| Browser-only (File API, IndexedDB) | Not aligned with pointer model |

**Recommendation:** File picker + optional directory scan under `VIDEO_LIBRARY_ROOT`; validate path on open.

### Video playback & scrubbing

Scrub lag in web apps is common with **GoPro source files**. It is usually **not** fixed by swapping player libraries.

#### Why scrubbing feels slow

| Cause | What happens |
|-------|----------------|
| **Sparse keyframes** | GoPro H.264/H.265 often puts I-frames every 1–5+ seconds. Seeking to 1:42.350 may jump to nearest keyframe at 1:40, then decode forward. |
| **High bitrate / 4K** | Browser must decode a large frame even for a tiny timeline drag. |
| **HEVC (H.265)** | Heavier decode; support varies by browser/GPU on Windows. |
| **MP4 layout** | If `moov` atom is at file end, range seeks can be slower until remuxed with `faststart`. |
| **Dragging the scrubber** | Firing dozens of `currentTime` updates per second overwhelms the decoder. |

Video.js, Plyr, and similar players improve controls and skinning; they **do not** change how the browser decodes or seeks the underlying file.

#### Recommended approach: dual-file model

```
Original (GoPro on your drive)     Scrub proxy (app cache, ffmpeg)
        │                                    │
        │                                    └── Intake form: scrub + lap markers
        └── Comparison form: full quality (or proxy if 4K still stutters)
```

1. **On intake** — after registering the path, backend runs ffmpeg in the background to produce a scrub proxy.
2. **Intake form** — timeline scrubbing and marker placement use the **proxy** only.
3. **Comparison form** — prefer **original** for quality; fall back to proxy if sync/perf struggles.
4. **Serving** — local API must support **HTTP Range** requests (`Accept-Ranges`, `206 Partial Content`) for both files.

#### ffmpeg sketch (illustrative)

Probe:

```bash
ffprobe -v quiet -print_format json -show_format -show_streams "input.mp4"
```

Scrub proxy (tune after sample file):

```bash
ffmpeg -i "input.mp4" \
  -vf "scale=-2:480" \
  -c:v libx264 -preset fast -crf 28 \
  -g 30 -keyint_min 30 \
  -c:a aac -b:a 96k \
  -movflags +faststart \
  "data/cache/{sessionId}/scrub.mp4"
```

At 60 fps source, use `-g 60 -keyint_min 60` for ~1 s keyframes.

Optional remux-only pass if original is already H.264 but slow to seek (no re-encode):

```bash
ffmpeg -i "input.mp4" -c copy -movflags +faststart "fixed.mp4"
```

Usually insufficient alone for GoPro — proxy transcode is the reliable fix.

#### UI techniques (in addition to proxy)

- **Debounce seeks** while dragging — update preview at ~5–10 Hz, final seek on mouse release.
- **Don't seek on every `input` event** during scrub — wait for `change` / pointer up for frame-accurate placement.
- **Filmstrip** (optional later) — pre-generated timeline thumbnails for instant visual feedback while dragging; proxy still needed for accurate marker time.

#### What we skip for v1

| Approach | Why skip |
|----------|----------|
| **WebCodecs + manual demux** | Powerful but high complexity |
| **HLS/DASH segment streaming** | Overkill for local single-user files |
| **ffmpeg.wasm in browser** | Slow for long GoPro files; better on backend |
| **Copy original into app storage** | Conflicts with pointer-only model |

#### Validation plan

When you provide a sample GoPro clip:

1. Test raw file in Chrome/Edge `<video>` — measure seek feel on timeline drag.
2. Generate proxy with ffmpeg; compare same scrub workflow.
3. Confirm marker placement accuracy (target: within ~50–100 ms with proxy + keyframes).

### 2. Synchronized multi-video playback

Each comparison pane plays a **segment** of the same (or different) source file:

```
Lap 3:  from marker[2] to marker[3]
Lap 7:  from marker[6] to marker[7]
```

Implementation sketch:

1. One hidden "master" timeline (or `requestAnimationFrame` loop) tracks elapsed comparison time `t` from 0 to `max(lap durations)`.
2. Each pane sets `video.currentTime = lapStart + t` while `t` is within that lap's duration; pauses or holds last frame when shorter laps finish early.
3. All panes share one play/pause/seek control adjusting `t`.

**Edge cases:** Different lap lengths ( shorter lap freezes or loops — TBD ), keyframe seek accuracy on comparison seeks, audio (often muted in comparison view). Comparison panes may use scrub proxy if full-res sync is too heavy.

### 3. Marker precision

With a **scrub proxy** (1 s keyframes, lower res), marker placement on the Intake form should be responsive and within ~50–100 ms. Fine nudge (frame step) is optional polish.

Original file seeks remain coarser if used without proxy — avoid marking laps on raw 4K HEVC in the browser.

### 4. Same file, multiple panes

Comparing two laps from **one registered video** can use **one `<video>` element cloned via Media Source** or **two elements pointing at the same URL** — two elements is simpler; browsers cache the file. Sync logic is the hard part, not duplication.

---

## Deployment options

See [Architecture — Local native vs Docker](ARCHITECTURE.md#local-native-vs-docker).

| Option | When to use |
|--------|-------------|
| **Local native (recommended)** | Default — dev and daily use on your Windows PC |
| **Local run single port** | `npm run build && npm start` → one URL, no Vite |
| **Docker Compose** | Optional later — NAS, reproducible env, one-command start |
| **Cloud VPS** | Only if you later want remote access |

**Prerequisites on host:** Node.js, ffmpeg on PATH, config pointing at your video drive.

---

## Suggested implementation phases

### Phase 0 — Decisions
Answer [Open Questions](OPEN_QUESTIONS.md); agree on [Working Agreement](WORKING_AGREEMENT.md).

### Phase 1 — Skeleton
Repo scaffold, dev scripts, empty routes/pages, data directory layout.

### Phase 2 — Import + library + proxy
Import flow, list sessions, ffmpeg scrub proxy job on intake, serve video with Range support.

### Phase 3 — Player + markers
Scrubbing player (proxy), add/move/delete markers, persist markers, compute lap times.

### Phase 4 — Lap list UI
Lap table, seek-to-lap, best lap highlight.

### Phase 5 — Comparison view
2-up sync playback; then 2×2 grid.

### Phase 6 — Polish
Keyboard shortcuts, thumbnails, delete session, error handling, backup/export.

---

## Reference patterns (inspiration, not dependencies)

- **Dashcam / coaching tools** — lap-based segment playback
- **DAW / NLE timeline markers** — marker interaction UX
- **Telemetry apps ( RaceChrono, TrackAddict )** — lap list + delta display (we skip telemetry for v1)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Large local files are hard to work with | Register by path; avoid copying originals |
| Scrub lag on GoPro files | ffmpeg scrub proxy on intake; debounced timeline; Range requests |
| Browser can't decode your codec | Proxy transcodes to H.264; original path unchanged |
| Sync drift between panes | Master clock; avoid relying on `timeupdate` alone |
| Scope creep (telemetry, AI laps) | Strict P0 list; defer to backlog |
