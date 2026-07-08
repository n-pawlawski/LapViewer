# Features

Feature specs for LapViewer, organized by area. Each item includes intent and draft acceptance criteria.

---

## Application structure

The UI is built around **three forms** — documented in [UI Forms](UI_FORMS.md):

| Form | Purpose |
|------|---------|
| **Data** | Browse sessions and laps; organize; select laps for comparison |
| **Intake** | Register a new video (path on drive) and add lap markers |
| **Comparison** | Synchronized multi-lap playback (side-by-side / grid) |

The tracking model for added videos is documented in [Video Library](VIDEO_LIBRARY.md).

---

## F1 — Video library & import

### F1.1 Import race video

**Intent:** Add a new session to the library via the [intake flow](INTAKE_FLOW.md).

**Acceptance criteria:**
- User starts intake from the library (“Add session”).
- User selects a single GoPro video via **browser file picker**.
- Upload shows progress; file goes to object storage via presigned PUT ([D-028](DECISIONS.md)).
- User can enter session metadata (title defaulting to filename; date, track, notes optional).
- App validates upload completion (HEAD object), blocks incomplete uploads.
- On success, session appears in the library and is playable.

### F1.2 Video library list

**Intent:** See all registered sessions at a glance.

**Acceptance criteria:**
- Data form shows a **Videos / Sessions** section listing every registered video.
- Each video row/card shows title, filename, status, lap count, and best lap when available.
- Clicking a video selects it and shows details plus laps for that video.
- Selected video can be opened in Intake for marker/metadata edits.
- Missing files remain in the list with a clear broken-link state.
- Thumbnail is optional v1.

### F1.2.1 Select between added videos

**Intent:** Switch the active video/session without leaving the Data form.

**Acceptance criteria:**
- Selecting a video updates the details pane and lap list.
- The selected video is visually highlighted.
- If no video is selected, the app selects the first available video or shows an empty state.
- The selected session may be represented in the URL for refresh/share within the local app.

### F1.3 Session metadata

**Intent:** Organize and identify sessions.

**Acceptance criteria:**
- Editable title (default: filename).
- Optional fields TBD: track name, date, notes, camera angle.

### F1.4 Public sessions (v1)

**Intent:** Let owners share uploaded sessions with other authenticated accounts.

**Acceptance criteria:**
- Data form has **My sessions \| Public sessions** tabs.
- Owner can **Make public** / **Make private** on S3-uploaded sessions only.
- Public list shows other users' sessions with owner display name.
- Viewers see lap table and can add public laps to Compare; no Intake/Edit/Delete.
- Ignored intake laps are not visible to other accounts.
- Video playback works for public S3 sessions.

---

## F2 — Video playback & scrubbing (Intake form)

Implemented on the [Intake form](UI_FORMS.md#2-intake-form).

### F2.1 Standard player controls

**Intent:** Normal video player UX.

**Acceptance criteria:**
- Play / pause
- Seek via timeline scrubber
- Current time and total duration displayed
- Keyboard shortcuts (space = play/pause, arrows = seek) — nice-to-have v1

### F2.2 Frame-accurate seeking (stretch)

**Intent:** Precise lap marker placement.

**Acceptance criteria:**
- Seek lands within an acceptable tolerance (e.g. ±100 ms) — exact requirement TBD.
- Optional: step forward/back one frame for fine placement.

---

## F3 — Lap marking (Intake form)

Implemented on the [Intake form](UI_FORMS.md#2-intake-form).

### F3.1 Lap-start markers

**Intent:** Define where each lap begins on the timeline.

**Acceptance criteria:**
- Add a marker at the current playback position (button or hotkey).
- Markers appear on the timeline as visual ticks/flags.
- Markers are ordered by time; lap numbers assigned sequentially (Lap 1, Lap 2, …).
- Edit: move marker by drag or by entering a timestamp.
- Delete individual markers.
- Markers persist when leaving and returning to the session.

### F3.2 Outlap / incomplete lap handling

**Intent:** Handle sessions that don't start at the start/finish line.

**Acceptance criteria:**
- First segment before Lap 1 marker can be labeled "Outlap" or excluded from lap list.
- Last segment after final marker handled consistently (open question: pit in lap?).

### F3.3 Lap time calculation

**Intent:** Derive times from markers.

**Acceptance criteria:**
- Lap N time = timestamp(Lap N+1 marker) − timestamp(Lap N marker).
- Last lap: end time TBD (session end, pit marker, or manual end marker).
- Times displayed as `m:ss.mmm` or similar format you prefer.
- Invalid state (fewer than 2 markers) shows helpful empty state, not wrong numbers.

### F3.4 Marker export/import (later)

**Intent:** Backup or transfer lap data without re-marking.

**Deferred** unless you want it early.

---

## F4 — Lap times UI (Data form)

**v1 build spec:** [features/VIEW_COMPARE_V1.md](features/VIEW_COMPARE_V1.md) (mock data first, VC-2).

Primary home for lap browsing and selection. See [UI Forms — Data form](UI_FORMS.md#1-data-form).

### F4.1 Lap list for a session

**Intent:** See all laps and times for one race.

**Status:** Ready — VC-2

**Acceptance criteria:**
- Table or list: lap number, lap time (`m:ss.mmm`), delta to best lap.
- Highlight best lap.
- Row click or checkbox toggles lap selection for compare tray.
- No inline player on Data in v1.

### F4.2 Cross-session lap selection (v1)

**Intent:** Select laps from different registered sessions for comparison.

**Status:** Ready — VC-2

**Acceptance criteria:**
- Data form shows all registered sessions; lap list reflects the selected session.
- **Compare tray** persists selections when switching sessions (checkboxes / basket).
- User selects **2** laps (first build; 2–4 in F5.3) from one or more sessions and opens Comparison.
- Compare tray shows session title + lap label + time for each selected lap.
- `Compare selected` disabled unless exactly 2 laps selected (first build).

**Deferred:** Unified “all laps” table with global filters (track/date across all sessions in one grid).

---

## F5 — Lap comparison view (Comparison form)

**v1 build spec:** [features/VIEW_COMPARE_V1.md](features/VIEW_COMPARE_V1.md) (2-up first, VC-3).

See [UI Forms — Comparison form](UI_FORMS.md#3-comparison-form).

### F5.1 Select laps for comparison

**Intent:** Choose which laps to watch together.

**Status:** Ready — VC-2

**Acceptance criteria:**
- From Data lap table, multi-select **2** laps (first build; 2–4 in F5.3).
- Compare tray shows clear indication of selected laps.
- Laps can come from the same session or different sessions (v1 — **D-009**).

### F5.2 Side-by-side layout (2-up)

**Intent:** Watch two laps in parallel.

**Status:** Ready — VC-3

**Acceptance criteria:**
- Two video panes, each playing the selected lap segment.
- Playback synchronized from lap start (`comparisonTime` = 0 at each start marker).
- Shared transport controls (play/pause/seek relative to lap start).
- Scrubbing updates all active panes to the same comparison time.
- Shorter lap: pane **freezes** on last frame when its segment ends (**D-008**).
- Audio **muted** (**D-007**).
- Back to Data preserves tray selection.

### F5.3 Grid layout (2×2)

**Intent:** Compare up to four laps at once.

**Status:** Deferred — after VC-3 validated

**Acceptance criteria:**
- Four panes in a 2×2 grid when four laps selected; fewer laps use 1×2 or 2×1 as appropriate.
- Same synchronized playback behavior as F5.2.

### F5.4 Comparison overlays (later)

**Intent:** Visual aids during comparison.

**Examples:** lap time delta counter, ghost line, sector splits.

**Deferred** unless requested.

---

## F6 — Data & persistence

### F6.1 Persist sessions and markers

**Intent:** Nothing is lost on refresh.

**Acceptance criteria:**
- Registered videos and marker data survive browser refresh.
- Registered videos and marker data survive server restart.
- Registered videos and marker data survive PC reboot.
- If Docker is used, registered videos and marker data survive container rebuild/recreate via a durable `DATA_DIR` mount.
- SQLite database lives at `DATA_DIR/lapviewer.db`.
- Original video files are not copied into the DB; sessions persist pointers plus root-relative paths.
- Scrub proxies and thumbnails live under `DATA_DIR/cache` and can be regenerated.

### F6.2 Storage management

**Intent:** Know how much space is used; delete old sessions.

**Acceptance criteria:**
- Delete a session (video + metadata + markers).
- Optional: show storage used per session.

---

## F7 — Assisted lap detection

**v1 design spec:** [features/AUTO_LAP_DETECTION_V1.md](features/AUTO_LAP_DETECTION_V1.md) (spike-derived).

**Intent:** Reduce manual marking — the user seeds a **start anchor** (and optional end) and the system proposes the remaining lap-start markers for review, improving over time via a per-track/per-mount template bank.

**Status:** Design decisions resolved (spec Q1–Q6); **ready for work order** (`WO-auto-lap-detection`). MVP = AD-1..AD-4 (start/finish); splits (AD-5) follow.

### F7.1 Auto-detect lap starts from an anchor

**Acceptance criteria:**
- User places a start anchor (F3.1) and clicks "Auto-detect laps".
- System proposes lap-start markers between start and end as **editable suggestions** (not silent inserts).
- Each proposal has a confidence; low-confidence ones are flagged for review.
- User can accept all, or nudge/delete individual proposals.
- Confirmed starts feed the track's template bank (accuracy improves next time).

### F7.2 Detection profile & template bank (persistence)

**Acceptance criteria:**
- A per-track/per-mount profile stores the ROI, scan fps, and optional lap-time prior.
- Confirmed start-line ROIs accumulate in the profile's bank and are reused across sessions on the same mount.

### F7.3 Split auto-detection (later)

**Deferred** to AD-5; spiked in `server/scripts/vision-auto-splits.mjs`.

---

## F8 — Reference-lap track progress (Phase 3B)

**Design spec:** [features/GOPRO_LAP_SPLIT_DETECTION.md](features/GOPRO_LAP_SPLIT_DETECTION.md) (LapViewer integration complete; **Ready for spike**).

**Intent:** Semi-automatic lap **and split** timing via a reusable track reference lap. Normalize track position to `0.0 → 1.0`; match new footage to that map; detect laps (wraparound) and splits (progress crossings); compare sector deltas in Compare.

**Status:** Spike passed (GO); M2-LV persistence next. **Blocked on** M2-LV work order for schema + Intake reference-lap editor.

**Relationship to F7:** F7 (3A) delivers ROI-NCC lap starts now; F8 (3B) is the long-term architecture for split timing and Compare deltas. Default sequencing: AD-5 first; spike may run in parallel.

### F8.1 Reference lap profile

**Acceptance criteria:**

- [x] User can mark a reference lap on Intake (start, splits, end) and save `track_reference_profiles` for a track.
- [x] `track_splits.progress` stores canonical split positions (0..1).
- [x] Reference session + lap number persisted.

### F8.2 Progress matching (spike-gated)

**Acceptance criteria:**

- [x] Progress-curve spike passes go-gate on same-session test footage.
- [x] Background job produces `timestamp → progress` curve and lap/split proposals with confidence.
- [x] User reviews and accepts proposals → existing `markers` API.

### F8.3 Compare split deltas

**Acceptance criteria:**

- [x] Compare shows sector delta table for two laps on the same track.
- [x] Deltas use `m:ss.mmm`; sync point selector unchanged.
- [x] Cross-session compare works when track splits align by `splitIndex`.

---

## Feature priority (proposed)

| Priority | Features |
|----------|----------|
| **P0 — Next slice** | F4.1, F4.2, F5.1, F5.2 — [VIEW_COMPARE_V1](features/VIEW_COMPARE_V1.md) VC-1–VC-4 (mock data) |
| **P0 — MVP (full product)** | F1.1, F1.2, F2.1, F3.1, F3.3, F6.1 |
| **P1 — Core value** | F3.2, F1.3, F5.3 (4-up grid) |
| **P2 — Enhanced** | F2.2, F6.2, F7 (assisted lap detection — [spec](features/AUTO_LAP_DETECTION_V1.md)) |
| **P3 — Later** | F3.4, F5.4, F8 (reference-lap detection — [spec](features/GOPRO_LAP_SPLIT_DETECTION.md)), telemetry |
