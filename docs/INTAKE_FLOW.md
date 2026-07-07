# Video Intake Flow

Design for bringing new GoPro race footage into LapViewer. This is a **workflow spec** — not implemented yet. Decisions marked **TBD** need your input before we build.

Related: [Open Questions §1.3](OPEN_QUESTIONS.md), [Features F1](FEATURES.md), [Video Library](VIDEO_LIBRARY.md), [Technical Approach — File storage](TECHNICAL_APPROACH.md).

---

## Goals

1. **No file duplication** — register a path on your video drive; DB stores the pointer.
2. **Repeatable process** — same steps every time you add footage from a track day.
3. **Catch problems early** — missing file, wrong codec, duplicate import, unreadable path.
4. **Enough metadata upfront** — find sessions later without re-watching raw files.

---

## What we know about your footage

| Item | Status |
|------|--------|
| Camera | **GoPro** (all footage) |
| Container / codec / resolution | **TBD** — confirm with a sample file (see below) |
| Storage | Existing drive on this PC; DB holds paths only |

### Typical GoPro output (assumptions until verified)

GoPros usually record **MP4** with **H.265 (HEVC)** or **H.264**, often **1080p or 4K** at **30 or 60 fps**. Long sessions may split into multiple files (`GOPR####.MP4`, `GP01####.MP4`, …).

**Why a sample file helps:** We can run `ffprobe` (or similar) once to lock in codec, resolution, frame rate, and audio — and verify browser playback on your PC. A **short clip** (30–60 seconds) is enough; it does not need to be a full race.

**Where to put it (when ready):** e.g. `samples/` in the repo with a `.gitignore` entry so large files are never committed — or just tell us the path on your video drive and we probe it locally during dev.

---

## Intake flow overview

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  1. Start   │───▶│  2. Select   │───▶│  3. Details │───▶│  4. Review   │
│   intake    │    │    file(s)   │    │  (metadata) │    │  & register  │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                                  │
                                                                  ▼
                           ┌──────────────┐    ┌──────────────────────────┐
                           │  6. Library  │◀───│  5. Validate & probe     │
                           │   (ready)    │    │  (path, codec, duration) │
                           └──────────────┘    └──────────────────────────┘
                                                                  │
                                                                  ▼
                                                    Optional: 7. Mark laps
                                                    (separate workflow)
```

Lap marking stays **outside** the register-only steps in [Intake Flow](INTAKE_FLOW.md) — on the **Intake form**, registration (Phase A) and lap marking (Phase B) are one combined screen. See [UI Forms](UI_FORMS.md).

---

## Step-by-step (draft)

### Step 1 — Start intake

**Entry points (pick which we support in v1):**

| Option | Description |
|--------|-------------|
| **A. Library “Add session”** | Button from main library screen |
| **B. Intake queue** | Dedicated “New footage” area for batch adds after a track day |
| **C. Folder watch** | Auto-detect new files under `VIDEO_LIBRARY_ROOT` — **defer** unless you want it early |

**TBD:** A only for MVP, or A + B?

---

### Step 2 — Select file(s)

User picks one GoPro video via the **browser file picker** on the Intake form.

| Mode | v1? | Notes |
|------|-----|-------|
| **Single file** | Yes | One race → one session |
| **Browser upload** | Yes | Presigned PUT to S3/MinIO ([D-028](DECISIONS.md)) |
| **Path registration** | Legacy only | Deprecated when `STORAGE_BACKEND=s3` |
| **Multi-file same session** | TBD | GoPro splits; may need “merge logically” as one session with multiple paths |

**TBD:** Do you ever need **one session = multiple GoPro files** (split recording)? If yes, intake must support grouping.

**Checks at selection:**
- File exists and is readable
- Extension / MIME looks like video
- Not already registered (duplicate path in DB)

---

### Step 3 — Session details (metadata)

Form fields collected at intake (required vs optional TBD):

| Field | Required? | Default |
|-------|-----------|---------|
| Title | Optional | Filename without extension |
| Date / time | Optional | File modified time or GoPro metadata if available |
| Track / venue | Optional | — |
| Notes | Optional | — |
| Camera | Optional | “GoPro” (prefilled) |

**TBD:** Which fields are **required** before you can finish intake?

**TBD:** Should intake suggest title from folder name (e.g. `2025-05-18-TrackName\GOPR1234.MP4`)?

---

### Step 4 — Review & confirm

Summary screen before commit:

- File path (full or relative to library root)
- Probed duration, resolution, codec (from step 5 preview if async)
- Metadata entered in step 3
- Warning if duplicate or codec may not play in browser

Actions: **Register** | **Back** | **Cancel**

---

### Step 5 — Validate & probe

On confirm (or in background after select):

1. **Path valid** — file still exists
2. **Probe** — duration, video codec, audio presence, dimensions, fps (ffprobe or backend equivalent)
3. **Playback check** — optional: “Test play 3 seconds” in UI
4. **Persist** — insert session row: `{ id, sourcePath, title, date, notes, probedMetadata, importedAt }`

The persisted row becomes part of the [Video Library](VIDEO_LIBRARY.md), which is what the Data form uses to show every added video and switch between them.

**Failure handling:**

| Failure | UX |
|---------|-----|
| File missing | Block register; show error |
| Duplicate path | Block or offer “open existing session” |
| H.265 / unsupported in browser | Warn; still allow register with “may need proxy later” |
| Probe timeout | Retry or register with unknown duration |

---

### Step 6 — Register complete → marking on Intake (Phase B)

- Session is registered and playable; it appears on the **Data** form session list.
- User continues on the **Intake form** to scrub and place lap markers (same screen; see [UI Forms — Intake](UI_FORMS.md)).
- Marker and metadata changes **auto-save** on add/remove/edit (**D-010**). No **Done** button — user returns to Data via app navigation when ready.

---

### Step 7 — Post-intake marking

Same as Phase B on the Intake form — not a separate route unless we split UX later.

---

## Intake vs path registration

**Updated 2026-07-07 ([D-028](DECISIONS.md)):** New sessions use **browser upload** to object storage (MinIO locally, S3 in production). Path registration is deprecated for new sessions; legacy `local_path` rows remain supported.

| Path model (legacy) | Upload model (current) |
|---------------------|------------------------|
| Register path on existing drive | Browser file picker → presigned PUT |
| Windows file picker / typed path | Progress bar during upload |
| `VIDEO_LIBRARY_ROOT` bind mount | Object key in S3/MinIO bucket |

See [DEPLOYMENT.md](DEPLOYMENT.md) and [WO-unified-upload.md](work-orders/WO-unified-upload.md).

---

## Open design questions (for you)

Answer in chat or inline below — these shape v1 intake UI.

### Q1 — Single file vs GoPro segments

When GoPro splits one outing into `GOPRxxxx` + `GP01xxxx` + …:

- [ ] Each file is a **separate session**
- [ ] User **groups files** into one session during intake
- [ ] Unsure / need to see how often this happens

**Your answer:**

### Q2 — Required metadata

Minimum to finish intake:

- [ ] Title only (default from filename)
- [ ] Title + date
- [ ] Title + date + track
- [ ] Other: ___

**Your answer:**

### Q3 — Intake entry point

- [ ] “Add session” from library is enough for v1
- [ ] Want a dedicated **intake / queue** page for batch adds

**Your answer:**

### Q4 — Folder structure on your drive

How is footage organized today?

- [ ] Flat folder
- [ ] By date
- [ ] By track / event
- [ ] GoPro DCIM dump as-is
- [ ] Other: ___

**Your answer:**

### Q5 — Duplicate handling

Same file imported twice:

- [ ] Hard block
- [ ] Allow but warn
- [ ] Allow silently

**Your answer:**

### Q6 — After intake

- [ ] Land on **lap marking** view immediately
- [ ] Land on **library** and mark laps later
- [ ] Ask each time

**Your answer:**

---

## MVP intake scope (proposal)

**In v1:**

- “Add session” from library
- Single-file select from `VIDEO_LIBRARY_ROOT`
- Title (default filename) + optional date, track, notes
- Probe duration + codec; duplicate path blocked
- Register → open session for playback / marking

**Deferred:**

- Multi-file grouping
- Folder scan / watch
- Batch queue UI
- Auto-metadata from GoPro EXIF

---

## Implementation notes (for later)

- Config: `VIDEO_LIBRARY_ROOT` points at your drive path.
- Backend endpoint sketch: `POST /api/sessions { sourcePath, title, date?, track?, notes? }` → validate → probe → insert.
- Frontend: wizard or single-page form — **TBD** after Q2/Q3 answered.
- Sample GoPro file: used once in dev to confirm `<video>` playback in your primary browser.

---

## Next step

1. Optionally provide a **short sample GoPro clip** (path on drive or `samples/` locally).
2. Answer **Q1–Q6** above (even roughly).
3. We fold answers into [Features F1](FEATURES.md) acceptance criteria and Phase 2 checklist.
