# UI Forms

LapViewer is organized around **three primary forms** (screens). Each form has a distinct job; together they cover the full workflow from new footage to lap comparison.

Related: [UI Design](UI_DESIGN.md), [Intake Flow](INTAKE_FLOW.md), [Video Library](VIDEO_LIBRARY.md), [Features](FEATURES.md), [Project Overview](PROJECT_OVERVIEW.md).

---

## Form map

```
                    ┌─────────────────┐
                    │   Data Form     │
                    │  browse/organize│
                    │  sessions & laps│
                    └────────┬────────┘
              new session    │     select laps to compare
                    ┌────────▼────────┐
                    │  Intake Form    │
                    │ register video  │
                    │ + lap markers   │
                    └────────┬────────┘
                             │ laps saved
                             │
              select laps ───┼───────────────────┐
                             │                   │
                    ┌────────▼────────┐          │
                    │ Comparison Form │◀─────────┘
                    │  multi-lap view │
                    └─────────────────┘
```

| Form | Primary purpose | Typical entry |
|------|-----------------|---------------|
| **Data** | See everything in the system; find, filter, organize, select laps | App home / library |
| **Intake** | Bring in a new video and mark laps on it | “Add session” from Data form |
| **Comparison** | Watch selected laps together (side-by-side or grid) | “Compare” from Data form with laps selected |

---

## 1. Data Form

**Role:** The **catalog and control center** for all sessions and laps stored in LapViewer.

The Data form owns the main **Videos / Sessions** section. It reads from the [Video Library](VIDEO_LIBRARY.md), shows every registered video, and keeps one video selected at a time.

### What the user does here

- Browse registered sessions (races/videos).
- See lap lists per session — times, best lap, lap count.
- Search, filter, or sort (by date, track, title — fields TBD).
- Organize sessions (rename, notes, tags, delete — scope TBD).
- Select a video/session and view its metadata, status, and laps.
- **Select one or more laps** across sessions for comparison.
- Open an existing session for more lap editing (may route to Intake form in “edit” mode).
- Start **Add session** → Intake form.

### UI sketch (conceptual)

```
┌──────────────────────────────────────────────────────────────────┐
│ LapViewer                                    [+ Add session]      │
├──────────────────────────────────────────────────────────────────┤
│ Filters: [All sessions ▼] [Track ▼] [Date range]    [Search…]  │
├─────────────────────────────┬────────────────────────────────────┤
│ Videos / Sessions           │ Selected video details + laps      │
│ ┌─────────────────────────┐ │ Title: 2-19 racing league         │
│ │ > GX010012.MP4          │ │ File: GX010012.MP4                │
│ │ Ready · 12 laps         │ │ Status: Ready                     │
│ └─────────────────────────┘ │ [Open Intake] [Relink] [Delete]   │
│ ┌─────────────────────────┐ │ ┌────┬──────────┬────────┬─────┐ │
│ │   GX010013.MP4          │ │ │ ☐  │ Lap 1    │ 1:42.3 │     │ │
│ │ Processing proxy        │ │ │ ☑  │ Lap 3    │ 1:40.1 │ best│ │
│ └─────────────────────────┘ │ └────┴──────────┴────────┴─────┘ │
│                             │ [Compare selected (2)]            │
└─────────────────────────────┴────────────────────────────────────┘
```

### Data this form reads

- Sessions: `{ id, title, sourcePath, status, date, track, notes, … }`
- Laps (derived from markers): `{ sessionId, lapNumber, startTime, endTime, lapTime }`

### Video selection behavior

- Clicking a video selects it and loads its details and laps.
- The selected session can optionally be reflected in the URL, e.g. `/?session=abc123`.
- `Add session` opens Intake in new-session mode.
- `Open Intake` opens Intake in edit mode for the selected session.
- `Compare selected` is disabled until two or more laps are selected.

### Cross-session browsing (v1 — **D-009**, confirmed)

**In scope:** You can select laps from **different registered sessions** and open Comparison.

**v1 UX:**

- Left: session list. Right: lap list for the **currently selected** session only.
- Lap checkboxes stay checked when you select another session and pick more laps.
- A **comparison selection** strip (or footer) lists all checked laps with session name + lap label; `Compare selected` opens Comparison when 2–4 laps are checked.

**Deferred for v1:** A single unified “all laps” table across every session (filterable mega-list). Use session switching + persistent selection instead.

### Open design questions

- **Selection model:** Checkboxes on laps; max selection = comparison pane limit (2–4).
- **Organize:** Tags, folders, favorites — v1 or later?

---

## 2. Intake Form

**Role:** **Onboard a new video** and **place lap markers** in one focused workflow.

Combines what was previously split as “intake” + “markup view” — you enter here for new footage and leave when the session is registered and laps are marked (or partially marked).

### What the user does here

**Phase A — Register**

1. Select video file on library drive.
2. Enter session metadata (title, date, track, notes).
3. Confirm; app probes file and registers path.

**Phase B — Mark laps**

4. Scrub/play video with standard player controls.
5. Add, move, delete lap-start markers on timeline.
6. See live lap list with computed times.
7. Changes auto-save; return to Data via nav when finished, or continue refining.

**Edit mode:** Same form when reopening an existing session to adjust markers or metadata (not only net-new intake).

### UI sketch (conceptual)

```
┌──────────────────────────────────────────────────────────────────┐
│ Intake — 2025-05-18 Track A                         Saved ✓    │
├──────────────────────────────────────────────────────────────────┤
│ Metadata: Title [………]  Date [……]  Track [……]  Notes [……]       │
├──────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐   │
│ │                     Video player                           │   │
│ └────────────────────────────────────────────────────────────┘   │
│ |──●────●──────●────●──────●──────●──────────────────| 0:00     │
│      L1    L2      L3    L4      L5      L6          [+ Marker]  │
├──────────────────────────────┬───────────────────────────────────┤
│ Lap list                     │ File: D:\Racing\GOPR1234.MP4      │
│ Outlap        —              │ Duration: 24:12 · H.265           │
│ Lap 1         1:42.356       │                                   │
│ Lap 2         1:41.102       │                                   │
│ …                            │                                   │
└──────────────────────────────┴───────────────────────────────────┘
```

### Relationship to [Intake Flow](INTAKE_FLOW.md)

The intake flow doc describes **Phase A** (register) in detail. **Phase B** (markers) lives on the same form — no separate “markup screen” required unless we later split for UX reasons.

### Resolved (2026-05-28)

- **Persistence:** Registering the file creates/updates a **session** in the library so it is browsable on Data (**D-010**).
- **While marking:** **Auto-save** on add, remove, or edit of metadata or markers; visible save state (`Saving` / `Saved` / `Error`). No **Done** or **Save** button for v1.
- **Leaving Intake:** Use global nav to **Data**; select the session you were editing when practical.
- **Partial intake:** Zero markers after register is OK (session still on Data).

### Open design questions

- **Single page vs wizard:** One scrollable form (metadata + player) or stepped wizard (register → then mark)?

---

## 3. Comparison Form

**Role:** **Play multiple selected laps in sync** for visual and timing comparison.

### What the user does here

- View 2–4 lap segments simultaneously (side-by-side or 2×2 grid).
- Shared transport: play, pause, seek relative to lap start.
- See lap labels and times per pane.
- Swap laps, add/remove panes (within max), or return to Data form to change selection.

### UI sketch (conceptual)

```
┌──────────────────────────────────────────────────────────────────┐
│ Compare                                    [← Back to data]      │
├───────────────────────────────┬──────────────────────────────────┤
│ Session A · Lap 3 · 1:40.1    │ Session A · Lap 7 · 1:40.5       │
│ ┌───────────────────────────┐ │ ┌───────────────────────────┐    │
│ │      video pane 1         │ │ │      video pane 2         │    │
│ └───────────────────────────┘ │ └───────────────────────────┘    │
├───────────────────────────────┴──────────────────────────────────┤
│        ▶  ━━━━━●━━━━━━━━━━━━━━━  0:32 / 1:40  (synced)          │
│ Layout: [Side-by-side ▼]   Audio: [Pane 1 ▼]                   │
└──────────────────────────────────────────────────────────────────┘
```

Grid mode (when 3–4 laps selected): 2×2 layout per [Features F5.3](FEATURES.md).

### Entry requirements

- At least **2 laps** selected on Data form.
- Laps may be from the **same session** or **different sessions** (v1 — **D-009**).

### Open design questions

- **Shorter lap ends:** Freeze finished pane on last frame (**D-008**).
- **Change selection in place** without returning to Data form?

---

## Navigation summary

| From | To | Action |
|------|-----|--------|
| Data | Intake | Add session / Edit session |
| Data | Comparison | Compare selected laps (≥2) |
| Intake | Data | Nav: Data (session stays selected when possible) |
| Intake | Comparison | Optional shortcut if laps selected (TBD) |
| Comparison | Data | Back / change selection |

**Default home screen:** Data form.

---

## Implementation phasing (forms)

| Phase | Form | Deliverable |
|-------|------|-------------|
| 2 | Data (minimal) | Session list only; click → Intake |
| 2–3 | Intake | Register + player + markers + lap list |
| 3 | Data (full) | Lap list per session, multi-select |
| 4–5 | Comparison | 2-up, then grid |

---

## Form-specific acceptance criteria (summary)

### Data form
- [ ] Lists all registered sessions.
- [ ] Shows laps for selected session with times.
- [ ] Multi-select laps and launch Comparison with ≥2 selected.
- [ ] Add session navigates to Intake form.

### Intake form
- [ ] Register new video by path (no copy).
- [ ] Edit session metadata.
- [ ] Player with scrub; add/edit/delete lap markers.
- [ ] Lap times update live from markers.

### Comparison form
- [ ] Plays selected laps synchronized from lap start.
- [ ] Side-by-side (2); grid (up to 4) when scoped.
- [ ] Returns to Data form to change selection.

---

## Notes for later

- **Sample GoPro file:** Still useful to validate player on Intake and Comparison forms; add when ready.
- **Naming:** “Form” = full-screen route/view in the app (e.g. `/data`, `/intake/:id`, `/compare`).
