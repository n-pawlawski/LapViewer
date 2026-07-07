# Open Questions

Decisions needed from you before or during implementation. Work through these in order — early sections unblock architecture; later sections refine UX.

Copy answers inline under each question, or tell me in chat and I'll update this doc.

---

## 1. Product scope & usage

### 1.1 Who uses this?

- [x] Only you, on your own machines *(current build)*
- [ ] You, but accessible from phone/tablet on home network
- [ ] You, from anywhere (cloud)
- [x] Eventually other drivers / shared access *(long-term goal)*

**Your answer:**

**Now:** Local-first on your Windows PC ([D-001](DECISIONS.md)).

**Aspiration:** Web app where anyone uploads races and compares with others — see [ROADMAP.md](ROADMAP.md). Deploy deferred; accounts and Data refactor come first.

### 1.2 How many sessions / total storage?

Rough estimate helps size storage and DB choices.

- Number of videos per year: ___
- Typical file size: ___
- Typical duration: ___
- Total library size you expect: _TBD_

**Your answer:**

Video files already live on a dedicated drive on this PC. That drive is the source of truth for video files — the app should use it to organize, reference, and work with footage. The database must **not** duplicate video blobs; it only stores **pointers** (file paths) into that directory, plus session metadata and lap markers.

Quantitative estimates (count, size, duration) still TBD.

**Related decision (see §4.2):** Register path only — no copy-on-import.

### 1.3 Video source & format

What camera/system produces the footage?

- Camera / device: **GoPro** (all footage)
- Container (MP4, MOV, …): _TBD — confirm via sample probe; typically **MP4**_
- Codec (H.264, H.265, …): _TBD — GoPro often **H.265 (HEVC)** or **H.264** depending on settings_
- Resolution / framerate: _TBD — often 1080p/4K at 30 or 60 fps_
- Audio — keep, mute, or optional in comparison view? _TBD_

**Your answer:**

All footage comes from a **GoPro**. Exact container/codec/resolution should be confirmed by probing a real file during setup — a short sample clip is useful for that (see [Intake Flow](INTAKE_FLOW.md)).

**Intake:** New videos should go through a defined **intake process** (select file → metadata → validate → register). Flow is documented in [INTAKE_FLOW.md](INTAKE_FLOW.md); design questions Q1–Q6 still need answers.

---

## 2. Lap timing rules

### 2.1 What defines a "lap"?

- [x] Start/finish line crossing (marker at SF line each lap)
- [x] Sector or split markers for timing/compare (Phase 3B — [GOPRO_LAP_SPLIT_DETECTION.md](features/GOPRO_LAP_SPLIT_DETECTION.md) F8)
- [ ] Some laps excluded (outlap, inlap, formation lap)

**Your answer:**

### 2.2 First segment before Lap 1 marker

- [x] Label as "Outlap" and exclude from lap times
- [ ] Count as Lap 1
- [ ] Let me toggle per session

**Your answer:**

### 2.3 Last lap end

When there is no marker after the final lap:

- [ ] End at video end
- [ ] Require a manual "pit in" / end marker
- [ ] End at last marker only (no time for final lap until end marker added)

**Your answer:**

### 2.4 Time display format

- [x] `m:ss.mmm` (e.g. 1:42.356)
- [ ] Seconds only with decimals (102.356)
- [ ] Other: ___

**Your answer:** **`m:ss.mmm`** for lap times and compare readouts. See `docs/features/VIEW_COMPARE_V1.md`.

### 2.5 Invalid / partial laps

If you delete a marker or leave gaps:

- [ ] Recalculate lap numbers automatically
- [ ] Show warnings for overlapping markers

**Your answer:**

---

## 3. Comparison view behavior

### 3.1 Same session only, or cross-session?

- [ ] v1: compare laps within one video only
- [x] v1: must compare laps across different registered videos

**Your answer:** Cross-session comparison is in scope for v1. See discussion in `UI_FORMS.md` (selection model) and decision **D-009**.

### 3.2 Maximum panes

- [x] 2 (side-by-side only) — **first build**
- [ ] 4 (2×2 grid) — F5.3 after VC-3
- [ ] More: ___

**Your answer:** **2-up first** (VIEW_COMPARE_V1 / D-017). Four-lap grid deferred to F5.3.

### 3.3 When laps are different lengths

Shorter lap finishes before longer ones:

- [x] Freeze on last frame
- [ ] Loop shorter lap
- [ ] Stop all when shortest ends
- [ ] Stop all when longest ends

**Your answer:** When a shorter lap reaches its end, **freeze that pane on its last frame** while longer laps keep playing. (Not “stop all” playback — we want to see how far behind the others still are.) Decision **D-008**.

### 3.4 Audio in comparison view

- [x] Muted by default
- [ ] Play audio from one selected "master" pane
- [ ] Mix all (usually bad — not recommended)

**Your answer:** v1: **muted by default**. **Deferred:** user-selectable audio source / swap which pane’s audio plays (see backlog in §9). Decision **D-007**.

### 3.5 Sync reference point

- [x] Sync at lap start (t = 0 at each lap marker)
- [ ] Sync at a specific corner / manual offset (advanced — defer?)

**Your answer:** **`comparisonTime` = 0** at each lap’s start marker. See VIEW_COMPARE_V1.

---

## 4. Hosting & deployment

### 4.1 Where does it run?

- [x] Local app on Windows PC only (draft)
- [ ] Local app but Docker
- [ ] Home server / NAS
- [ ] Cloud VPS
- [ ] Other: ___

**Your answer:**

**Now:** React + Node monorepo on this PC ([D-001](DECISIONS.md)). Native mode; SQLite in `DATA_DIR`.

**Later:** Hosted web app on AWS (or similar) for multi-user upload and compare — **explicitly deferred**. See [ROADMAP.md](ROADMAP.md). Finish Intake, users, and Data refactor first.

### 4.2 Should videos stay on disk where they already are?

**Superseded by [D-028](DECISIONS.md) (2026-07-07):** New sessions upload to object storage. Legacy path-only answer below applies to existing `local_path` rows only.

- [x] ~~Register path only~~ → **Browser upload to S3/MinIO for new sessions**
- [ ] Copy into app-managed storage on upload (rejected — use object store directly)
- [ ] Hybrid

**Original answer (legacy sessions):**

Videos on the existing drive remain valid for `local_path` sessions. New sessions store originals in object storage; the database holds `objectKey`, not a host path.

### 4.3 Internet required?

- [ ] Fully offline after install
- [ ] Online OK for updates/auth only
- [ ] Online required

**Your answer:**

---

## 5. Technology preferences

### 5.1 Languages / frameworks you prefer

- Frontend: ___
- Backend: ___
- Any hard "no" list: ___

**Your answer:**

### 5.2 Database comfort

- [x] SQLite is fine
- [ ] JSON files for MVP is fine
- [ ] Prefer Postgres
- [ ] No preference

**Your answer:**

SQLite is the draft choice for persistent sessions and markers. It should live at `DATA_DIR/lapviewer.db`; Docker must mount that directory so data survives container rebuilds.

### 5.3 Monorepo vs separate repos

- [ ] Single repo (frontend + backend together)
- [ ] Separate repos

**Your answer:**

---

## 6. UX & design

### 6.1 Primary browser

- [ ] Chrome / Edge
- [ ] Firefox
- [ ] Safari (Mac)
- [ ] Must support all

**Your answer:**

### 6.2 Dark/light theme

- [x] Dark only
- [ ] Light only
- [ ] System preference toggle

**Your answer:** **Dark only** for v1. No system theme toggle. Decision **D-006**.

### 6.3 Visual style

Any references you like (apps, sites, "minimal", "motorsport dashboard", etc.):

**Your answer:**

### 6.4 Keyboard-first marking

Important for fast marker placement while watching?

- [ ] Yes — hotkeys are P0
- [ ] Nice to have later
- [ ] Mouse-only is fine

**Your answer:**

---

## 7. Data & backup

### 7.1 Export

Do you want to export lap markers / times?

- [ ] JSON/CSV export
- [ ] Not needed initially

**Your answer:**

### 7.2 Backup strategy

- [ ] Manual copy of data folder is enough
- [ ] Built-in backup/export tool

**Your answer:**

---

## 8. Working together (boundaries)

See [Working Agreement](WORKING_AGREEMENT.md) for the full template. Key questions:

### 8.1 Decision authority

- [ ] I lead product; you propose defaults and implement after I approve
- [ ] You can choose sensible defaults without asking for small decisions
- [ ] Ask before any architectural change

**Your answer:**

### 8.2 Implementation pace

- [ ] Small PR-sized chunks with review between
- [ ] Larger batches OK
- [ ] MVP as fast as possible, refine later

**Your answer:**

### 8.3 What you don't want the agent to do without asking

Examples: add dependencies, change stack, delete data, deploy, spend money on cloud.

**Your answer:** Agents may manage git (branch, commit, merge). Still ask for new remotes, dependencies, data deletion, deploy.

**Decision:** [D-012](DECISIONS.md)

### 8.4 Git / commits

- [x] Agent may commit when a logical unit is done (and manage branches)
- [ ] Only I commit
- [ ] Agent commits only when I say

**Your answer:** Agents manage git — branch, commit, merge as part of work items. Ask before adding a remote. See **D-012**.

### 8.5 Multi-agent workflow

How should we split work between documentation, implementation, review, and future automation agents?

- [ ] Use a documentation-design pass before medium/large implementation work
- [ ] Implementation agent may update docs directly as behavior changes
- [ ] Use a separate review/verification pass before considering a feature done
- [ ] Keep all agent coordination informal unless the task is large

**Your answer:**

Draft approach: use [Agent Workflow](AGENT_WORKFLOW.md) as the coordination model. Documentation design owns feature intent and acceptance criteria; implementation owns code; review checks the result against the docs.

---

## 9. Future backlog (not v1 — capture ideas)

Things you might want later but should **not** block MVP:

- Comparison view: **select which pane’s audio plays** (swap audio source — see **D-007**)
- Automatic lap detection
- GPS / telemetry overlay
- Sector times
- Sharing links with friends
- Mobile upload from phone
- Integration with ___

**Your notes:**

---

## Question priority

| Priority | IDs | Why |
|----------|-----|-----|
| **Blockers** | 1.1, 1.3, 4.1, 4.2 ✓, 5.1 | Determine architecture |
| **High** | 2.1–2.4, 3.1–3.3, 6.1 | Determine MVP behavior |
| **Medium** | 3.4–3.5, 6.2–6.4, 7.x | Shape UX and polish |
| **Process** | 8.x | How we work together |

Once blockers are answered, we can produce a **Phase 1 checklist** and scaffold the repo.
