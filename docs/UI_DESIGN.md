# UI Design

Visual and interaction design direction for LapViewer.

This document builds on [UI Forms](UI_FORMS.md), [Features](FEATURES.md), [Video Library](VIDEO_LIBRARY.md), and [Intake Flow](INTAKE_FLOW.md). `UI_FORMS.md` owns the three-screen model; this doc owns how those screens should look, feel, and behave.

---

## Design intent

LapViewer should feel like a focused desktop analysis tool, not a social video app or a generic media library.

The UI should optimize for:

- Quickly finding the right session.
- Marking laps accurately without fighting the interface.
- Seeing lap times clearly.
- Comparing laps with minimal setup.
- Making file/status problems obvious.

The visual language should be calm, dark, dense enough for analysis, and easy to scan during repeated use.

---

## Visual direction

### Recommended style

- **Theme:** dark-first, with enough contrast for garage/track-day lighting.
- **Mood:** technical, motorsport dashboard, practical.
- **Layout:** desktop-first, panel-based, with persistent context.
- **Density:** medium-high. Show useful information without making the app feel cramped.
- **Accent color:** one primary accent for selected items, active markers, and primary actions.
- **Status colors:** limited and semantic:
  - ready/saved
  - processing
  - warning/missing
  - error

Avoid:

- Decorative gradients.
- Large marketing-style hero sections.
- Heavy animations.
- Hidden controls required for core workflows.
- Mobile-first layouts for v1.

---

## App shell

Use one consistent shell across the app:

```text
┌────────────────────────────────────────────────────────────────────┐
│ LapViewer          Data   Intake   Compare        Status / config  │
├────────────────────────────────────────────────────────────────────┤
│ Page-specific content                                              │
└────────────────────────────────────────────────────────────────────┘
```

### Header behavior

Header should include:

- App name.
- Current form tabs or route links: `Data`, `Intake`, `Compare`.
- Primary global action: `Add session`.
- Lightweight status/config area:
  - library root configured or missing
  - backend health
  - ffmpeg/proxy status later

### Navigation rules

- Default route opens the Data form.
- Data is the home base.
- Intake is entered from `Add session` or `Open Intake`.
- Compare is entered from selected laps.
- Returning from Intake should preserve the selected session on Data.
- Returning from Compare should preserve the selected lap selection when practical.

---

## Screen 1: Data form

The Data form should be the command center.

### Layout

Use a two-pane layout:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Toolbar: Add session, filters, search                              │
├──────────────────────────────┬─────────────────────────────────────┤
│ Sessions list                │ Selected session workspace          │
│                              │                                     │
│ session cards                │ summary + actions                   │
│                              │ lap table                           │
│                              │ compare tray                        │
└──────────────────────────────┴─────────────────────────────────────┘
```

Left pane:

- Sessions list.
- Search.
- Filters for track/date/status later.
- Sort by newest, title, best lap later.

Right pane:

- Selected session summary.
- Metadata.
- Status and file health.
- Action buttons.
- Lap table.
- Compare selection tray.

### Session card design

Each session row/card should show:

- Title.
- Filename.
- Track/date if known.
- Status.
- Lap count.
- Best lap if available.

Selected session should be visibly highlighted.

Status should be obvious but not visually noisy:

- `Ready`
- `Processing proxy`
- `Missing file`
- `Error`

### Lap table

The lap table should prioritize lap number and time.

Columns:

- Select checkbox.
- Lap.
- Time.
- Delta to best.
- Notes/status later.

Behavior:

- Best lap gets a subtle highlight.
- Clicking a lap row can seek/open that lap in context.
- Selecting 2 to 4 laps enables `Compare selected`.
- If fewer than 2 laps are selected, compare is disabled with a short hint.

### Empty states

No sessions:

```text
No sessions added yet.
Add your first GoPro video from your configured racing footage drive.
[Add session]
```

Selected session has no markers:

```text
No laps yet.
Open Intake to add lap markers.
[Open Intake]
```

Missing file:

```text
Original file is missing.
Markers are preserved, but playback and comparison are disabled until relinked.
[Relink file]
```

---

## Screen 2: Intake form

The Intake form should feel like a focused marking workstation.

### Layout

Use a top-to-bottom flow with the player as the primary object:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Intake header: session title, save state (no Done — use nav)       │
├────────────────────────────────────────────────────────────────────┤
│ Metadata strip                                                     │
├────────────────────────────────────────────────────────────────────┤
│ Video player                                                       │
│ Timeline with markers                                              │
│ Transport controls + Add marker                                    │
├──────────────────────────────┬─────────────────────────────────────┤
│ Marker/lap list              │ File/proxy/status details           │
└──────────────────────────────┴─────────────────────────────────────┘
```

### Register mode

When adding a new session, Intake starts with:

1. Select file.
2. Confirm metadata.
3. Register.
4. Probe/proxy status appears.
5. Mark laps.

Recommended v1 UX: one page with progressive sections, not a separate wizard. Disable marker tools until a file is registered and playable.

### Edit mode

When reopening an existing session:

- Metadata is editable.
- Player loads the session video/proxy.
- Existing markers are visible.
- Marker changes save automatically or through a clear save action.

### Marker interaction

Primary actions:

- Play/pause.
- Scrub.
- Add marker at current time.
- Move marker.
- Delete marker.
- Edit timestamp manually.

Recommended controls:

- `Add marker` button near transport controls.
- Keyboard shortcut later: `M` to add marker, space to play/pause.
- Marker ticks on the timeline with lap labels.
- Selected marker highlights both timeline tick and row in marker list.

### Save behavior

v1 behavior (**D-010**):

- **Register** creates/updates the session in the library so it is browsable on Data.
- Metadata and marker **add / remove / edit** triggers **auto-save** with save state: `Saved`, `Saving`, `Unsaved`, `Error`.
- **No Done button** — return to Data via app navigation; keep that session selected when possible.

### Intake states

- No file selected.
- File selected but not registered.
- Registering.
- Probe successful.
- Probe warning.
- Proxy pending.
- Proxy processing.
- Proxy ready.
- Missing file.
- Save error.

---

## Screen 3: Comparison form

The Comparison form should remove distractions and make video comparison feel synchronized.

### Layout

Two selected laps:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Compare header: selected laps, Back to Data                        │
├──────────────────────────────┬─────────────────────────────────────┤
│ Lap pane A                   │ Lap pane B                          │
│ video                        │ video                               │
│ label + time                 │ label + time                        │
├──────────────────────────────┴─────────────────────────────────────┤
│ Shared transport: play/pause, relative seek, elapsed time           │
└────────────────────────────────────────────────────────────────────┘
```

Three or four selected laps:

- Use 2x2 grid.
- Empty fourth pane should not appear unless four laps are selected.

### Pane labels

Each pane should show:

- Session title.
- Lap number.
- Lap time.
- Delta from best or compared baseline later.

### Shared controls

Controls are shared across all panes:

- Play/pause.
- Seek relative to lap start.
- Current comparison time.
- Total duration based on selected behavior for shorter laps.

### Comparison behavior

Recommended v1 defaults:

- Sync starts at lap marker.
- Audio muted by default; selectable audio pane is **deferred** (see **D-007**).
- Two laps side-by-side first.
- Four-lap grid later.
- When a shorter lap ends, **freeze that pane on its last frame**; longer laps continue until they end (see **D-008**).

---

## Core component model

### App shell

- Header.
- Route tabs.
- Global status.
- Main content region.

### Session list

- Search/filter toolbar.
- Session card.
- Status badge.
- Empty state.

### Session details

- Metadata summary.
- File health.
- Action row.
- Lap table.
- Compare tray.

### Video workstation

- Metadata strip.
- Video player.
- Marker timeline.
- Transport controls.
- Marker/lap side panel.
- Save state.

### Comparison player

- Comparison grid.
- Pane label.
- Shared transport.
- Selection summary.

---

## Interaction priorities

### P0 UI behavior

- Data form lists sessions.
- Add session starts Intake.
- Intake registers one file and opens marker tools.
- Markers are visible and editable.
- Data form shows computed lap list.
- User can select 2 laps and open Comparison.
- Comparison plays 2 laps side-by-side with shared controls.

### P1 UI behavior

- 2 to 4 lap selection.
- Better filters/search.
- Missing/relink state.
- Proxy status and progress.
- Keyboard shortcuts.
- Save state polish.

### P2 UI behavior

- Unified all-laps table (cross-session selection uses persistent checkboxes in v1 — **D-009**).
- Thumbnails.
- Inline comparison selection changes.
- Layout preferences.
- Marker import/export.

---

## Resolved UI decisions (2026-05-28)


| #   | Question           | Decision                                                                      | Doc       |
| --- | ------------------ | ----------------------------------------------------------------------------- | --------- |
| 1   | Theme              | Dark only for v1                                                              | **D-006** |
| 2   | Intake persistence | Register saves a **session** to the library; **auto-save** on add/remove/edit | **D-010** |
| 3   | Leaving Intake     | **No Done** — use nav to Data; select current session when landing on Data    | **D-010** |
| 4   | Comparison audio   | Muted by default; **swap audio source** between panes → later                 | **D-007** |
| 5   | Shorter laps       | **Freeze** finished pane on last frame; others keep playing                   | **D-008** |
| 6   | Cross-session      | Session list + **persistent lap checkboxes** (not unified all-laps table)     | **D-009** |


---

## Recommended first UI implementation slice

Build a static shell before deep data work:

1. App shell with top nav.
2. Data form with sample session list and selected session details.
3. Intake form layout with metadata strip, video area, marker timeline placeholder, lap list.
4. Comparison form layout with two panes and shared transport placeholder.

This gives us something visual to react to before locking down API and persistence details.