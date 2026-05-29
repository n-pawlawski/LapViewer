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
- User selects a single GoPro video file from the library drive (file picker scoped to configured root).
- User can enter session metadata (title defaulting to filename; date, track, notes optional — exact required fields TBD).
- App validates path, probes duration/codec, blocks duplicate paths.
- App registers the file path in the database — **no copy** of the video file.
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

Primary home for lap browsing and selection. See [UI Forms — Data form](UI_FORMS.md#1-data-form).

### F4.1 Lap list for a session

**Intent:** See all laps and times for one race.

**Acceptance criteria:**
- Table or list: lap number, lap time, maybe delta to best lap.
- Highlight best lap.
- Click a lap to seek the player to that lap's start.

### F4.2 Cross-session lap selection (v1)

**Intent:** Select laps from different registered sessions for comparison.

**Acceptance criteria:**
- Data form shows all registered sessions; lap list reflects the selected session.
- Lap selection **persists** when switching to another session (checkboxes / comparison basket).
- User can select 2–4 laps from one or more sessions and open Comparison.
- Comparison selection UI shows session title + lap label for each selected lap.

**Deferred:** Unified “all laps” table with global filters (track/date across all sessions in one grid).

---

## F5 — Lap comparison view (Comparison form)

See [UI Forms — Comparison form](UI_FORMS.md#3-comparison-form).

### F5.1 Select laps for comparison

**Intent:** Choose which laps to watch together.

**Acceptance criteria:**
- From lap list, multi-select 2–4 laps (max layout TBD).
- Clear indication of which laps are selected.
- Laps can come from the same session or different sessions (v1 — **D-009**).

### F5.2 Side-by-side layout (2-up)

**Intent:** Watch two laps in parallel.

**Acceptance criteria:**
- Two video panes, each playing the selected lap segment.
- Playback synchronized from lap start (time 0 = each lap's start marker).
- Shared transport controls (play/pause/seek relative to lap start).
- Seeking in one pane seeks all panes.

### F5.3 Grid layout (2×2)

**Intent:** Compare up to four laps at once.

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

## Feature priority (proposed)

| Priority | Features |
|----------|----------|
| **P0 — MVP** | F1.1, F1.2, F2.1, F3.1, F3.3, F4.1, F6.1 |
| **P1 — Core value** | F5.1, F5.2, F3.2, F1.3 |
| **P2 — Enhanced** | F5.3, F4.2, F2.2, F6.2 |
| **P3 — Later** | F3.4, F5.4, auto-detection, telemetry |
