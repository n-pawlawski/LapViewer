# Assisted Lap Detection — v1 Design

**Status:** Draft
**Date:** 2026-07-02
**Owner:** Product/architecture design pass (from vision spike)
**Related:** [FEATURES.md](../FEATURES.md) (F3 lap marking, F7 assisted detection), [GOPRO_LAP_SPLIT_DETECTION.md](GOPRO_LAP_SPLIT_DETECTION.md) (long-term reference-lap architecture), [INTAKE_FLOW.md](../INTAKE_FLOW.md), [UI_FORMS.md](../UI_FORMS.md), [TECHNICAL_APPROACH.md](../TECHNICAL_APPROACH.md), [PERSISTENCE.md](../PERSISTENCE.md), [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md)

---

## Intent

Reduce manual lap marking from "place every marker by hand" to "place a couple of anchors and review the rest." The user seeds a session with a **start anchor** (and optionally an **end**), and the system proposes the remaining lap-start markers for the user to confirm or nudge.

The system is **assistive, not autonomous**: every auto-detected marker is a proposal the user can accept, move, or delete. The goal is to automate *as much as possible* while tolerating variance in camera mounting and track layout that would break a fully automatic system.

---

## Why this shape (spike findings)

A spike (`server/scripts/vision-lapstart-spike.mjs`, `vision-lapstart-apply.mjs`, `vision-auto-splits.mjs`) tested visual detection on real footage. Key results, which drive this design:

| Finding | Evidence | Design consequence |
|---------|----------|--------------------|
| **Visual template matching works** for start/finish when a distinctive landmark (checkered-flag barrier) is framed. | On `GX010012` (track "Sweeper"), an ROI over the flag detected **12/12** lap starts. | Detection is ROI + normalized cross-correlation (NCC) against reference frame(s). |
| **A single reference template is biased.** One example reproduces a fixed ~0.6–1.0s offset between "best flag match" and the user's marked line. | 1-mark bootstrap: 12/12 but mean ~0.7s, systematic late bias. | Need **multiple confirmed references** (a bank) to cancel the offset. |
| **Multiple references remove the bias.** Best-match-against-any of several confirmed line-ROIs. | 4 references → **mean 0.34s**, no bias. | Store a **per-track / per-mount template bank** that grows as laps are confirmed. |
| **Lap starts are quasi-periodic; exploit it.** | Autocorrelation of the match signal recovered lap time within ~0.1s; anchored windowed search beat blind peak-picking. | Detection = anchor + estimated lap time + small search window + proximity weighting, re-syncing each lap. |
| **Camera-mount / framing changes break naive transfer.** | Same track, different league day (`GX010022`): the reference ROI covered generic barriers (matches everywhere) and the flag shrank to a fleeting speck; detections landed on random floor/barrier. | The bank is keyed to a **mount/framing profile**, not just the track. A new/changed mount needs re-calibration (new ROI + fresh anchor). |
| **Scores alone lie; verify visually.** | High NCC (0.6–0.7) but inconsistent detected frames. | Detection quality must be judged by **consistency + user review**, not score threshold alone. |

**Bottom line:** fully automatic cross-session detection is not reliable while mounting/track vary. A **human-in-the-loop, anchor-seeded, bank-improving** system is.

---

## User workflow (MVP)

On the **Intake form**, after a session is registered and playable:

```text
1. User scrubs to the first lap start and places the START anchor  (manual, required)
2. (first time on this track) User confirms the landmark ROI box in the ROI UI
3. User clicks "Auto-detect laps"
4. A detection panel (beside the video) shows progress and live results
5. System proposes lap-start markers from the anchor to the end of the session
6. Proposals render on the timeline in a distinct "suggested" style
7. User steps through each proposal with keyboard shortcuts to check / nudge / delete
8. Confirmed markers are saved; confirmed start-ROIs feed the track's template bank
```

**End of session (Q3):** there is no separate "end" anchor. The system keeps detecting
line crossings forward; the **last crossing is the end of the final lap / session**, and
footage after it is cuttable. If the user has already placed a final lap marker, detection
stops there. Otherwise it stops when match confidence collapses (pit-in / footage ends).

**Review is always required (Q6):** MVP review is sequential — run detection, then use
keyboard shortcuts to walk each placed marker and confirm/adjust. Confidence values are
captured so a later UI update can rank/bulk-accept, but MVP does not depend on that.

---

## MVP scope

**In:**

- Manual **start anchor** (reuses existing F3.1 lap-start marker) as the required seed.
- One **"Auto-detect lap starts"** action that fills all laps from the anchor to session end.
- **ROI calibration UI (in MVP, per Q4):** the user draws/confirms the landmark box once per track; guided by approach frames like the spike.
- **Detection panel** beside the video (per Q5) showing progress and results while the job runs.
- Detected markers are **proposals** with a confidence value; user reviews each via keyboard.
- Confirmed starts are appended to a **per-track template bank** (per Q2) for future sessions.
- Stops at the user's final marker if present, else at confidence collapse / footage end (per Q3).

**Out (later phases):**

- Auto-detecting **splits** — the explicit next step after start/finish works; same ROI/keyframe mechanism (spiked in `vision-auto-splits.mjs`). Start/finish is the MVP because splits are unreachable if it fails.
- Fully automatic detection with **no** anchor.
- Confidence-ranked / bulk-accept review UI and refined keyboard shortcuts (later UI update).
- Multi-camera / multi-file sessions.

---

## Detection pipeline (technical)

Given: video path, start anchor time `t0`, optional end `tN`, an ROI box (fractions of frame), and a template bank (≥1 reference ROI).

1. **Sample** frames from `t0-δ` to `tN` (or session end) at `SCAN_FPS` (5–8), downscaled (e.g. 320×180); cache per fps so re-tuning is cheap.
2. **Score** each frame: crop ROI → grayscale → `NCC` against **each** bank template → take the **max** (best-match-wins).
3. **Estimate lap time**: autocorrelation of the score timeline over a plausible range (e.g. 15–60s), unless a track prior/override exists.
4. **Anchor**: snap `t0` to the best bank match within ±0.6s.
5. **Walk forward**: for each expected start (`anchor + k·lapTime`, or cumulative with re-sync), search a small window (±2–2.5s) for the frame maximizing `score − prox·|t − expected|` (proximity weighting keeps an off-time lookalike from winning). Record it and continue.
6. **Stop condition (Q3)**: end at the user's final marker if one exists; otherwise stop when the window's best match confidence collapses (no more strong crossings). The last accepted crossing marks the end of the final lap; later footage is ignored (cuttable).
7. **Confidence** per detection = match score (and/or agreement with the periodic prior). Low-confidence ones are flagged for review.
8. **Emit proposals** (do not silently persist); render detected-frame thumbnails and progress to the Intake detection panel for review.

Parameters (ROI, `SCAN_FPS`, window, proximity, lap-time prior) live in the mount/track profile so they are reusable and tunable.

---

## Data model (decided)

Builds on the existing `tracks` concept. **Persistence agent finalizes column types/migrations.**

### Detection profile — one per **track layout** (Q2)

The user homogenizes the camera mount, so the profile is keyed to the **track**, not a
separate mount identity. Minor mount/track drift is absorbed by spatial-shift tolerance
(robustness roadmap item 4), not by extra profiles.

```ts
{
  id: string;
  trackId: string;          // existing track (1:1 for MVP)
  roi: { x0: number; y0: number; x1: number; y1: number }; // fractions 0..1, set in ROI UI
  scanFps: number;          // default 5
  lapTimePriorMs?: number;  // optional seed for autocorrelation
  createdAt: string;
  updatedAt: string;
}
```

### Template bank entry — hybrid provenance + cached blob (Q1)

Store provenance as the source of truth **and** cache the grayscale ROI for speed/robustness.
If the ROI changes, re-derive blobs from provenance where the source video still exists;
entries whose videos went missing keep their cached blob.

```ts
{
  id: string;
  profileId: string;
  sourceSessionId: string;  // provenance
  timeSeconds: number;      // confirmed start time in source video
  roiUsed: { x0: number; y0: number; x1: number; y1: number }; // ROI when captured
  roiGrayCache: Blob;       // cached grayscale ROI vector (~<10 KB)
  confirmedAt: string;
}
```

Notes:

- Bank vectors are tiny; dozens per profile is negligible storage.
- A session records the **profile** it was detected with (for re-runs and provenance).
- Splits (phase AD-5) reuse the same profile + bank concept, keyed by split index instead of the start line.

---

## Implementation phases

| Phase | Deliverable | In MVP? | Notes |
|-------|-------------|---------|-------|
| **AD-1** | Server detection service: given session + anchor + ROI + bank → proposed lap-start times with confidence, as a **background job with progress**. Read-only (no auto-persist). | ✅ | **Delivered** — `lapDetection.ts`, `lapDetectionMath.ts`, `detectionJobs.ts`, routes below. |
| **AD-2** | Detection-profile + template-bank tables; migrations; DB access. | ✅ | **Delivered** — `detection_profiles`, `detection_bank`, `server/src/services/detectionProfiles.ts`. |
| **AD-3** | Intake UI: start anchor + "Auto-detect" button; **detection panel** beside the video (progress + results); proposals as suggested markers; **keyboard review** to check/nudge/delete; feed confirmed ROIs to bank. | ✅ | **Delivered** — `DetectionReviewPanel`, auto-detect flow, review shortcuts below. |
| **AD-4** | **ROI calibration UI**: guided landmark-box selection per track (approach frames), stored on the profile. | ✅ | **Delivered** — `RoiCalibrationModal` on Intake; prompt when track ROI missing; Edit ROI affordance. |
| **AD-5** | Extend detection to per-lap **splits** using lap-1 split keyframes. | — | Explicit next step; from `vision-auto-splits.mjs`. Blocked on start/finish working. |

**MVP = AD-1 + AD-2 + AD-3 + AD-4.** Splits (AD-5) follow once start/finish detection is trusted.

---

## Efficiency & robustness roadmap (beyond MVP)

Ordered from cheapest/highest-value to more advanced:

1. **Bank growth (self-improving).** Every confirmed start appends to the profile's bank; accuracy rises toward ~0.3s and bias disappears with no extra user effort. *(Directly validated in spike.)*
2. **Confidence-ranked review.** Sort proposals by confidence so the user only scrutinizes the weak ones; "accept all high-confidence" bulk action.
3. **Lap-time prior per track.** Persist typical lap time to make autocorrelation and windowing robust on short/odd sessions.
4. **Spatial-shift tolerance.** Search a few pixels of ROI offset so *small* mount drift and track-layout tweaks don't require full re-calibration. Handles the user's "track changes slightly" case.
5. **Outlier / gap handling.** Detect missed or extra laps (a gap ≈ 2× lap time, or an implausibly short gap) and flag rather than silently mis-number. Covers the "intervals aren't guaranteed" edge case.
6. **End-boundary inference.** If the user marks end, constrain the walk; if not, stop when match confidence collapses (pit-in / session end).
7. **Multi-landmark fusion.** Use more than one distinctive feature (e.g. flag + a banner) and combine scores for resilience when one is occluded.
8. **Profile auto-match.** Fingerprint a new session's framing and auto-select the best existing profile (or prompt to calibrate) instead of asking every time.
9. **Sub-frame / higher-fps refinement.** After coarse detection, re-scan a tight window at higher fps for tighter timing where it matters.
10. **(Stretch) learned detector.** If template matching plateaus, a small trained model for "start/finish crossing" — only if the simpler pipeline proves insufficient.

---

## Non-goals (v1)

- Autonomous detection with zero user input.
- Guaranteeing accuracy across arbitrary, uncalibrated camera mounts.
- GPS/telemetry-based detection (footage lacks usable GPS; see spike history).
- Real-time / on-capture detection.

---

## Risks & constraints

- **Mount consistency drives accuracy.** Large framing changes require re-calibration (new ROI + anchor). The design tolerates this via profiles + human review, and *small* drift via spatial-shift tolerance — but a wildly different mount is a fresh calibration, by design.
- **Distinctive landmark required.** Detection relies on a repeatable visual cue at start/finish. If none is well-framed, accuracy degrades to "propose from periodicity, user corrects."
- **HEVC decode.** Frame extraction needs an HEVC-capable ffmpeg (spike used a specific build); intake/probe already touches ffmpeg — align the binary. See [TECHNICAL_APPROACH.md](../TECHNICAL_APPROACH.md).
- **Compute time.** Whole-video scans take tens of seconds; cache scan frames and run detection as a background job with progress.

---

## Resolved decisions

| # | Question | Decision |
|---|----------|----------|
| Q1 | Bank storage: blob vs reference? | **Hybrid** — store provenance (`sessionId`, `timeSeconds`, `roiUsed`) as source of truth **plus** a cached grayscale blob for speed/robustness. Re-derive blobs from provenance when ROI changes and the video exists. |
| Q2 | Profile scope? | **Per track layout** (1:1 with track). User homogenizes the mount; minor drift handled by spatial-shift tolerance, not extra profiles. |
| Q3 | End anchor? | **No separate end anchor.** Detect forward; last crossing = session/last-lap end; footage after is cuttable. Stop at the user's final marker if present, else at confidence collapse. |
| Q4 | ROI calibration location? | **UI in the MVP** (AD-4). Guided landmark-box selection per track. |
| Q5 | Detection run mode? | **Button-triggered background job** with a **progress/results panel** beside the video on Intake. |
| Q6 | Trust threshold / review? | **Review always required** for MVP. Sequential keyboard review of each proposal; confidence captured for a later ranked/bulk-accept UI. |

### Follow-on (post-MVP)

- Splits detection (AD-5) — explicitly wanted; same profile/bank mechanism keyed by split index.
- Confidence-ranked review, refined keyboard shortcuts, bulk-accept — later UI update.

---

## Traceability

| Spec | Features |
|------|----------|
| Manual start anchor (seed) | F3.1 |
| Auto-fill middle lap starts | F7 (new) |
| Split auto-detection | F7 / F3 (phase AD-5) |
| Persistence of profiles/bank | F6.1 |

---

## Implementation status

Status: **Ready for work order** — Q1–Q6 resolved (see above). Next: create `WO-auto-lap-detection`
splitting the MVP into typed items in dependency order: **persistence (AD-2) → api (AD-1) → client (AD-3, AD-4)**,
plus `unit-test` / `review`. Splits (AD-5) are a later work order.

**Layout dependency:** AD-3 needs the Intake form to host a detection panel beside the video —
coordinate with [UI_FORMS.md](../UI_FORMS.md) / [UI_DESIGN.md](../UI_DESIGN.md) (the Intake screen has
space to the side of the player to scale into).

### API endpoints (AD-1)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/sessions/:id/detect-laps` | Start background detection job; body `{ anchorTime, endTime? }` → `{ jobId }` |
| `GET` | `/api/detect-laps/:jobId` | Job status, progress, proposals, lapTimeMs |
| `DELETE` | `/api/detect-laps/:jobId` | Cancel a running job |
| `GET` | `/api/sessions/:id/frame?t=&roi=` | PNG frame (optional ROI crop) for calibration/review |
| `PUT` | `/api/tracks/:trackId/detection-profile` | Create/update profile (ROI, scanFps, lapTimePriorMs) |
| `GET` | `/api/tracks/:trackId/detection-profile` | Read profile |
| `GET` | `/api/tracks/:trackId/detection-profile/bank` | List bank entries (blobs omitted) |
| `POST` | `/api/tracks/:trackId/detection-profile/bank` | Append confirmed template (`roiGray` base64) |

Configure `FFMPEG_PATH` (HEVC-capable ffmpeg) and `DATA_DIR` per [PERSISTENCE.md](../PERSISTENCE.md).
Scan frames cache under `DATA_DIR/cache/{sessionId}/lap-detect-fps{N}-from{T}/`.

### Intake review keyboard map (AD-3)

Active while proposals are on screen (after auto-detect completes):

| Key | Action |
|-----|--------|
| `,` | Previous proposal |
| `.` | Next proposal |
| `Y` | Accept — persist `lapStart` marker + append template bank entry |
| `X` | Reject — remove proposal (no marker) |
| `[` | Nudge current proposal −1 frame |
| `]` | Nudge current proposal +1 frame |

Timeline: **suggested** markers use a dashed amber box; confirmed lap markers stay solid blue.

Owner: design pass from the vision spike (scripts under `server/scripts/vision-*.mjs`).
