# Work order: GoPro progress-curve spike

**Work order ID:** WO-gopro-progress-spike  
**Feature status:** Done (spike passed GO)  
**Priority:** P2  
**Git branch:** `feature/auto-lap-detection`

## Source of truth (read before implementing)

- Design: `docs/features/GOPRO_LAP_SPLIT_DETECTION.md` — §Progress-curve spike, §LapViewer data model mapping
- Phase 3A baseline: `docs/features/AUTO_LAP_DETECTION_V1.md`, `server/scripts/vision-lapstart-spike.mjs`
- Architecture: `docs/ARCHITECTURE.md` — Node + ffmpeg + sharp
- Decisions: `docs/DECISIONS.md` — D-019 (Node first), D-022 (sequencing)
- Persistence (future M2-LV): `docs/PERSISTENCE.md` §Reference-lap detection

## Feature summary

Validate the core 3B bet — **`timestampMs → estimatedTrackProgress`** — before any M3-LV product work. On known test footage (e.g. Sweeper / `GX010012`), build reference points from a manually marked reference lap, match a second lap in the same video, run greedy sequence alignment, and inspect the progress sawtooth.

This is a **script spike**, not a shipped UI feature. Outcome is go/no-go for M3-LV implementation work orders.

## Acceptance criteria (feature level)

- [x] Spike script runs on `GX010012` (or agreed test session) with manually marked reference lap bounds.
- [x] Extracts ~5 fps normalized frames (Node + ffmpeg + sharp).
- [x] Builds reference points with NCC patches or pHash (no Python required for spike).
- [x] Matches second lap frame-by-frame; runs Stage 7 MVP sequence rules from design doc.
- [x] Emits JSON/CSV of `{ timestampMs, estimatedProgress, confidence }` for inspection.
- [x] Documented go/no-go result against gates below.

## Go / no-go gates

**Go (proceed to M3-LV work orders):**

- Progress mostly monotonic within each lap
- Wraparound only near start/finish (`>0.9` → `<0.1`)
- Top-5 candidate match contains correct progress on **≥70%** of sampled frames (same-session test)

**Result on GX010012 (2026-07-06): GO** — top-5 hit 95.7%, monotonicity violations 7.3%. See design doc §Spike implementation status.

## Item index

| ID | Work type | Status | Title |
|----|-----------|--------|-------|
| WO-gopro-progress-spike-01 | api | Done | Progress-curve spike script + sample output |
| WO-gopro-progress-spike-02 | review | Draft | Go/no-go report vs gates |

---

## WO-gopro-progress-spike-01 — Progress-curve spike script

**Work type:** `api`  
**Status:** Done  
**Priority:** P2  

**Delivered:** `server/scripts/gopro-progress-spike.mjs`

**Run:**

```bash
npx tsx server/scripts/gopro-progress-spike.mjs GX010012.MP4
```

Env: `FFMPEG_PATH`, `ANCHOR_S` (default 100), `AUTO_LAPS=1`, `REF_START`/`REF_END`/… overrides.

**Verification:** GO on `GX010012.MP4` — output `data/cache/gopro-progress-spike-{sessionId}.json`.

---

## WO-gopro-progress-spike-02 — Go/no-go review

**Work type:** `review`  
**Status:** Draft  
**Priority:** P2  
**Blocked by:** — (WO-01 complete)

**Goal:** Formal review sign-off on spike GO; queue M2-LV persistence work order.

**Verification:**

- Review agent checklist in `docs/agents/review/BASE.md`.
- Spike metrics recorded in `docs/features/GOPRO_LAP_SPLIT_DETECTION.md`.

---

## Notes

- Do **not** add Python/OpenCV unless a future spike revision fails on Node fingerprints (D-019).
- Spike does not ship UI or API routes.
- **Next:** M2-LV — `track_reference_profiles` schema + Intake reference-lap editor.
