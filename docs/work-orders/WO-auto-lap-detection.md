# Work order: Assisted Lap Detection (MVP — start/finish)

**Work order ID:** WO-auto-lap-detection
**Feature status:** Ready
**Priority:** P2
**Git branch:** `feature/auto-lap-detection` (shared by all items unless noted)

## Source of truth (read before implementing)

- Feature / product: `docs/FEATURES.md` — **F7**
- Design spec: `docs/features/AUTO_LAP_DETECTION_V1.md` — MVP = **AD-1..AD-4**, decisions Q1–Q6
- UX: `docs/UI_FORMS.md`, `docs/UI_DESIGN.md` — Intake form (player + side space for a detection panel)
- Intake flow: `docs/INTAKE_FLOW.md` — Phase B (marking)
- Architecture: `docs/ARCHITECTURE.md`
- Persistence: `docs/PERSISTENCE.md` — `DATA_DIR`, SQLite, cache
- Decisions: `docs/DECISIONS.md` — D-010 (marker auto-save), D-012 (git)
- Spike reference (behavior to port, not ship as-is): `server/scripts/vision-lapstart-spike.mjs`, `server/scripts/vision-lapstart-apply.mjs`

## Feature summary

Let the user seed a session with a **start anchor** and one-time **landmark ROI** per track, then click **Auto-detect** to have the system propose the remaining lap-start markers by visual template matching (NCC over the ROI) guided by lap-period estimation. Detection runs as a **background job** with a **progress/results panel** beside the Intake video. Proposals are **editable suggestions** the user reviews via keyboard. Confirmed start-line ROIs accumulate in a **per-track template bank** so accuracy improves over time. Splits detection is a later work order (AD-5).

## Acceptance criteria (feature level)

- [ ] With a start anchor + a track ROI, "Auto-detect" proposes lap-start markers from the anchor to session end.
- [ ] Proposals are editable suggestions (not silent inserts); each has a confidence value.
- [ ] Detection runs as a background job; Intake shows progress and results in a side panel.
- [ ] User can step through proposals by keyboard to confirm / nudge / delete.
- [ ] Confirming markers persists them (existing marker model) and appends confirmed ROIs to the track's bank.
- [ ] A per-track detection profile stores the ROI, scan fps, and optional lap-time prior.
- [ ] Re-running on a track that already has a bank uses best-match-against-any (improved accuracy, no single-template bias).

## Item index

| ID | Work type | Status | Title |
|----|-----------|--------|-------|
| WO-auto-lap-detection-01 | persistence | Done | Detection profile + template bank schema & DB layer |
| WO-auto-lap-detection-02 | api | Done | Detection service (port spike), background job, routes |
| WO-auto-lap-detection-03 | client | Done | ROI calibration UI (AD-4) |
| WO-auto-lap-detection-04 | client | Done | Detection panel + keyboard review (AD-3) |
| WO-auto-lap-detection-05 | unit-test | Ready | Detection math + walk/stop logic tests |
| WO-auto-lap-detection-TS | test-strategy | Draft | Post-WO diff review + queue gaps |
| WO-auto-lap-detection-06 | review | Draft | AC vs build |

---

## WO-auto-lap-detection-01 — Detection profile + template bank schema & DB layer

**Work type:** `persistence`
**Status:** Done
**Priority:** P2
**Blocked by:** —
**Auxiliary context:** `docs/PERSISTENCE.md`, `server/src/db/database.ts`, `server/src/services/tracks.ts`

**Goal:** Persist a per-track detection profile and a growing template bank, per spec §Data model (decided).

**Context:** `tracks` and `markers` tables already exist (`server/src/db/database.ts`). Profile is 1:1 with a track (Q2). Bank entries are hybrid: provenance + cached grayscale blob (Q1).

**Work to perform when Ready:**

- Add tables to the `SCHEMA` in `server/src/db/database.ts` (idempotent `CREATE TABLE IF NOT EXISTS`):
  - `detection_profiles(id, trackId REFERENCES tracks(id) ON DELETE CASCADE, roiX0, roiY0, roiX1, roiY1 REAL, scanFps INTEGER, lapTimePriorMs REAL NULL, createdAt, updatedAt, UNIQUE(trackId))`
  - `detection_bank(id, profileId REFERENCES detection_profiles(id) ON DELETE CASCADE, sourceSessionId, timeSeconds REAL, roiX0..roiY1 REAL, roiGray BLOB, confirmedAt, createdAt)`
  - Index bank by `profileId`.
- Add a service `server/src/services/detectionProfiles.ts`:
  - get/create profile by `trackId`; update ROI / scanFps / lapTimePrior.
  - add bank entry; list bank entries for a profile (return blobs + provenance).
- Add DTO types to `server/src/types.ts`.
- No destructive migration; additive only.

**Acceptance criteria:**

- New tables created on `initDatabase()` without breaking existing DB.
- Service can create a profile for a track, persist/read the ROI, and append/list bank entries.
- Deleting a track cascades to its profile and bank.

**Verification:**

- `npm run check`
- Manual: start server on an existing `data/lapviewer.db`; confirm new tables exist and existing data intact.

**Docs to update when Done:**

- `docs/PERSISTENCE.md` — new tables and ownership.
- `docs/features/AUTO_LAP_DETECTION_V1.md` — mark AD-2 delivered.

---

## WO-auto-lap-detection-02 — Detection service, background job, routes

**Work type:** `api`
**Status:** Done
**Priority:** P2
**Blocked by:** —
**Auxiliary context:** `server/scripts/vision-lapstart-spike.mjs`, `server/scripts/vision-lapstart-apply.mjs`, `server/src/routes/markers.ts`, `server/src/video.ts`

**Goal:** Port the spike detection into a maintained server service, expose it as a background job with progress, and provide the endpoints the UI needs.

**Context:** Detection = sample ROI frames (ffmpeg) → NCC vs bank (best-match-wins) → autocorrelation lap time → anchor + windowed periodic walk with proximity weighting → stop at final marker or confidence collapse (spec §Detection pipeline). Whole-video scans take tens of seconds → must be async with progress. **Dependency note:** the spike uses `sharp` (image crop/grayscale) and an HEVC-capable `ffmpeg`. Confirm `sharp` is a server production dependency (not just scripts) and that a working ffmpeg path is configured; if either needs adding/changing, **get approval first** (per base rules).

**Work to perform when Ready:**

- New service `server/src/services/lapDetection.ts`:
  - Pure, testable helpers: `ncc`, `estimatePeriod` (autocorrelation), `periodicWalk` (anchor + window + proximity + stop condition). Keep these dependency-free for unit tests.
  - I/O layer: frame sampling via ffmpeg (reuse config/binary from `server/src/video.ts` / `config.ts`), ROI crop/grayscale via `sharp`, scan-frame caching under `DATA_DIR/cache`.
  - `runDetection({ sessionId, anchorTime, endTime?, profile, bank })` → `{ proposals: [{ time, score, confidence }], lapTimeMs }`.
- Background job model (in-process is fine for local app):
  - `POST /api/sessions/:id/detect-laps` → validates anchor + profile exist → starts job → returns `{ jobId }`.
  - `GET /api/detect-laps/:jobId` → `{ status: queued|running|done|error, progress: 0..1, proposals?, lapTimeMs?, error? }`.
  - Support cancel (optional) `DELETE /api/detect-laps/:jobId`.
- Frame-thumbnail endpoint for the ROI UI + review: `GET /api/sessions/:id/frame?t=<sec>&roi=<x0,y0,x1,y1>` → PNG (full frame and/or ROI crop).
- Proposals are returned only; **not** auto-persisted. Accepting a proposal uses existing marker create (`server/src/routes/markers.ts`, `kind: "lapStart"`); confirming also calls the profile service to append a bank entry (provenance + cached ROI blob).
- Wire routes in `server/src/index.ts`.

**Acceptance criteria:**

- Starting detection returns a job id immediately; status endpoint reports progress then final proposals.
- Proposals include time + confidence; nothing is written to `markers` by detection itself.
- Frame endpoint returns a viewable image for a given time/ROI.
- Pure helpers are exported for unit testing.

**Verification:**

- `npm run check`
- Manual: on `GX010012.MP4` (track "Sweeper") with lap-1 anchor + ROI, job completes and proposals align with the spike's 12 starts.

**Docs to update when Done:**

- `docs/features/AUTO_LAP_DETECTION_V1.md` — mark AD-1 delivered; note endpoints.
- Future `docs/API_CONTRACT.md` if/when created — detection endpoints.

---

## WO-auto-lap-detection-03 — ROI calibration UI

**Work type:** `client`
**Status:** Done
**Priority:** P2
**Blocked by:** —
**Auxiliary context:** `client/src/pages/IntakePage.tsx`, `client/src/components/IntakeMarkingPanel.tsx`, `docs/UI_DESIGN.md`

**Goal:** Let the user define/confirm the landmark ROI box for a track once, stored on the detection profile.

**Context:** Per Q4 the ROI needs a UI in the MVP. The spike did this by hand with approach frames + a drawn box. Reuse the frame-thumbnail endpoint from item 02.

**Work to perform when Ready:**

- On Intake, when the selected session's track has no profile ROI, prompt to calibrate.
- Show a representative frame (near the anchor) with a **draggable/resizable box**; store as fractions 0..1.
- Save via the profile service (through an api route from item 02) keyed by `trackId`.
- Allow re-opening to adjust the ROI later.

**Acceptance criteria:**

- User can draw/adjust a box over a frame and save it to the track profile.
- Saved ROI is reused on later sessions of the same track (no re-draw needed).
- ROI persists across reload.

**Verification:**

- `npm run check`
- Manual: draw ROI on a "Sweeper" session; reload; ROI still present and used by detection.

**Docs to update when Done:**

- `docs/features/AUTO_LAP_DETECTION_V1.md` — mark AD-4 delivered.
- `docs/UI_FORMS.md` — Intake ROI calibration affordance.

---

## WO-auto-lap-detection-04 — Detection panel + keyboard review

**Work type:** `client`
**Status:** Done
**Priority:** P2
**Blocked by:** —
**Auxiliary context:** `client/src/pages/IntakePage.tsx`, `client/src/components/IntakeMarkingPanel.tsx`, `docs/UI_DESIGN.md`

**Goal:** Add the "Auto-detect" action, a progress/results panel beside the video, and sequential keyboard review of proposals.

**Context:** Per Q5 detection runs on a button and shows progress + data in a side panel (Intake has space beside the player to scale into). Per Q6 review is always required for MVP: step each proposal via keyboard to confirm/nudge/delete. Confidence is shown; ranked/bulk-accept is a later UI update.

**Work to perform when Ready:**

- "Auto-detect laps" button (enabled when a start anchor + track ROI exist).
- On click: start job (item 02), poll status, render **progress** and streaming/`final` **proposals** in a side panel next to the video.
- Render proposals on the timeline in a distinct "suggested" style, separate from confirmed markers.
- Keyboard review: next/prev proposal, jump video to it, nudge ±frame/±small step, accept (→ persist marker + append bank entry), reject/delete. Document the shortcut map.
- Accepting/rejecting updates the lap list live; auto-save consistent with D-010.

**Acceptance criteria:**

- Button triggers detection; panel shows progress then proposals with confidence.
- Proposals are visually distinct from confirmed markers on the timeline.
- Keyboard shortcuts let the user walk and confirm/adjust/delete each proposal.
- Accepting a proposal persists a `lapStart` marker and appends a bank entry for the track.
- Rejecting removes the proposal without persisting a marker.

**Verification:**

- `npm run check`
- Manual: on a "Sweeper" session, run detection, review with keyboard, confirm lap list matches expectations.

**Docs to update when Done:**

- `docs/features/AUTO_LAP_DETECTION_V1.md` — mark AD-3 delivered; record the keyboard map.
- `docs/UI_FORMS.md` / `docs/UI_DESIGN.md` — Intake detection panel + suggested-marker style.

---

## WO-auto-lap-detection-05 — Detection math + walk/stop tests

**Work type:** `unit-test`
**Status:** Draft
**Priority:** P2
**Blocked by:** WO-auto-lap-detection-02, WO-auto-lap-detection-04

**Goal:** Cover the pure detection helpers with unit tests (no ffmpeg/video needed).

**Work to perform when Ready:**

- Test `ncc` (identical vectors → 1; anti-correlated → −1; length mismatch guarded).
- Test `estimatePeriod` on a synthetic periodic signal (recovers the injected period).
- Test `periodicWalk`: anchored spacing, proximity weighting prevents off-time lookalike wins, and the stop condition (final marker vs confidence collapse).

**Verification:**

- `npm test` (when the runner exists — see `docs/agents/PROJECT_STATE.md`).

---

## WO-auto-lap-detection-TS — Test strategy review

**Work type:** `test-strategy`
**Status:** Draft
**Priority:** P2
**Blocked by:** WO-auto-lap-detection-02, WO-auto-lap-detection-03, WO-auto-lap-detection-04

**Goal:** Review the WO diff; confirm checks green; queue new `unit-test` items for gaps.

**Verification:**

- Report: change → coverage matrix; new work item IDs.
- See `docs/agents/test-strategy/work-order-test-review.md`.

---

## WO-auto-lap-detection-06 — Review vs acceptance criteria

**Work type:** `review`
**Status:** Draft
**Priority:** P2
**Blocked by:** WO-auto-lap-detection-TS, WO-auto-lap-detection-04, WO-auto-lap-detection-05

**Goal:** Compare implementation to the feature-level acceptance criteria and spec §MVP scope.

**Verification:**

- Review agent checklist in `docs/agents/review/BASE.md`.

---

## Notes

- **Compute:** cache scan frames under `DATA_DIR/cache`; detection is a background job with progress (no synchronous long request).
- **Dependency approval:** confirm `sharp` is a production server dependency and a HEVC-capable ffmpeg path is configured before AD-1/AD-2; if a new dep or binary is required, get approval per base rules.
- **Bias lesson:** always score best-match-against-any of the bank (not a single/averaged template) — single templates carry a systematic offset (see spec findings).
- **Verify visually:** do not gate on NCC score alone; consistency of detected frames + user review is the quality bar.
- **Follow-on:** splits detection (AD-5) is a separate later work order reusing this profile/bank mechanism keyed by split index.
