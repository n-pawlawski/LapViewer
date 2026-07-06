# GoPro Lap & Split Detection — Reference-Lap Design

**Status:** Spike passed (GO) — M2-LV persistence may proceed
**Date:** 2026-07-06
**Owner:** Product/architecture design pass
**Related:** [ROADMAP.md](../ROADMAP.md) Phase 3, [AUTO_LAP_DETECTION_V1.md](AUTO_LAP_DETECTION_V1.md) (current MVP), [FEATURES.md](../FEATURES.md) F7, [INTAKE_FLOW.md](../INTAKE_FLOW.md), [PERSISTENCE.md](../PERSISTENCE.md)

---

## Relationship to current work

LapViewer Phase 3 ships in two layers:

| Layer | Doc | Scope |
|-------|-----|-------|
| **Near term (MVP)** | [AUTO_LAP_DETECTION_V1.md](AUTO_LAP_DETECTION_V1.md) | Anchor-seeded lap-start detection via ROI template matching (NCC); splits in AD-5 |
| **Long term (this doc)** | This file | Reference-lap **track progress** (`timestampMs → 0..1`); laps from progress wraparound; splits from progress crossings; lap comparison by delta |

The spike-validated MVP ([WO-auto-lap-detection](../work-orders/WO-auto-lap-detection.md)) delivers assisted lap marking now. This document is the **target architecture** for reliable split timing and cross-session lap comparison once a reusable track profile exists.

---

## Purpose

Build software that can take GoPro helmet footage from karting/racing sessions and produce reliable lap and split timing data.

The core goal is to let a user define virtual split locations on a track, similar to speedrunning splits or racing game sector markers, and then compare laps to see where time was gained or lost.

This design intentionally avoids trying to make the system fully automatic from day one. Instead, it uses a semi-calibrated approach:

> For each track, the user creates a reusable reference lap once. Future videos are matched against that reference lap to estimate track position over time.

---

## Core Concept

The system should not directly ask:

> "Is this the start line?"

Instead, it should ask:

> "Where on the known reference lap does this frame belong?"

Every processed video frame should eventually resolve to this structure:

```ts
timestampMs -> trackProgress
```

Where `trackProgress` is a normalized value from `0.0` to `1.0`.

Example:

```text
00:12.400 -> 0.000  // start/finish
00:18.900 -> 0.145  // after turn 1
00:25.200 -> 0.310  // back straight
00:39.800 -> 0.700  // final complex
00:52.100 -> 1.000  // finish
```

Once this exists, laps and splits become simple crossing events.

---

## Design Philosophy

### Prefer semi-automatic over fully automatic

Helmet-mounted GoPro footage is noisy:

- Head movement
- Motion blur
- Other karts blocking the camera
- Lighting variation
- Similar-looking corners
- Indoor tracks where GPS may be useless
- Camera angle differences between sessions

Because of this, the reliable solution is:

1. User creates a reference track profile once.
2. Software matches future footage to that profile.
3. User reviews only low-confidence results.

### Track position is the source of truth

Splits should not be stored as timestamps or individual screenshots.

Bad:

```text
Split 1 happens at 12.3 seconds into this video.
```

Good:

```text
Split 1 is located at 18.5% of the reference lap.
```

That means splits are reusable across videos and sessions.

---

## High-Level Pipeline

```text
Video file
  ↓
Extract frames + timestamps
  ↓
Normalize/crop/stabilize frames
  ↓
Extract visual fingerprints
  ↓
Match frames against reference lap
  ↓
Use sequence alignment to enforce forward track progress
  ↓
Generate timestamp -> trackProgress mapping
  ↓
Detect lap boundaries from progress wraparound
  ↓
Detect split crossings
  ↓
Compare laps and show deltas
```

---

## Main Product Workflow

### First time at a track

1. User imports a clean GoPro video.
2. User selects one clean reference lap.
3. User manually marks:
   - Start/finish
   - Optional split points
   - Finish
4. Software samples the reference lap and creates a `TrackProfile`.
5. Track profile is saved.

### Future sessions at the same track

1. User imports a new GoPro video.
2. User selects the matching track profile.
3. Software estimates `trackProgress` for frames in the new video.
4. Software detects laps and split times.
5. User reviews low-confidence detections.
6. User compares laps.

---

## Main Data Models

### TrackProfile

```ts
export type TrackProfile = {
  id: string;
  name: string;
  locationName?: string;
  direction?: "clockwise" | "counterclockwise" | "unknown";
  referenceLapId: string;
  referenceVideoId: string;
  splits: SplitPoint[];
  referencePoints: ReferencePoint[];
  createdAt: string;
  updatedAt: string;
};
```

### SplitPoint

```ts
export type SplitPoint = {
  id: string;
  name: string;
  progress: number; // 0.0 to 1.0
  thumbnailFrameId?: string;
};
```

### ReferencePoint

```ts
export type ReferencePoint = {
  id: string;
  trackProfileId: string;
  timestampMs: number;
  progress: number;
  framePath: string;
  thumbnailPath?: string;

  // Visual matching data
  perceptualHash?: string;
  embedding?: number[];
  localFeaturePath?: string;

  // Optional telemetry
  gpsLat?: number;
  gpsLon?: number;
  gyroX?: number;
  gyroY?: number;
  gyroZ?: number;

  confidence?: number;
};
```

### ImportedVideo

```ts
export type ImportedVideo = {
  id: string;
  originalPath: string;
  normalizedPath?: string;
  durationMs: number;
  frameRate?: number;
  width: number;
  height: number;
  hasTelemetry: boolean;
  createdAt: string;
};
```

### ProcessedFrame

```ts
export type ProcessedFrame = {
  id: string;
  videoId: string;
  timestampMs: number;
  framePath?: string;

  estimatedProgress?: number;
  confidence?: number;

  candidateMatches?: CandidateMatch[];
};
```

### CandidateMatch

```ts
export type CandidateMatch = {
  referencePointId: string;
  progress: number;
  visualScore: number;
  featureScore?: number;
  telemetryScore?: number;
  sequenceScore?: number;
  finalScore: number;
};
```

### LapResult

```ts
export type LapResult = {
  id: string;
  videoId: string;
  trackProfileId: string;
  lapNumber: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  confidence: number;
  splitTimes: SplitTime[];
};
```

### SplitTime

```ts
export type SplitTime = {
  splitPointId: string;
  timestampMs: number;
  elapsedMs: number;
  confidence: number;
};
```

---

## Suggested Folder Structure

This assumes a TypeScript app with a backend worker that can call Python/OpenCV for video processing.

```text
/src
  /app
    /tracks
    /videos
    /laps
    /compare

  /domain
    track-profile.ts
    video.ts
    lap-result.ts
    split.ts

  /services
    video-import-service.ts
    frame-extraction-service.ts
    track-profile-service.ts
    lap-detection-service.ts
    split-detection-service.ts
    lap-comparison-service.ts

  /vision
    frame-normalizer.ts
    visual-fingerprint-service.ts
    reference-matcher.ts
    sequence-aligner.ts
    confidence-scorer.ts

  /storage
    db.ts
    video-storage.ts
    frame-storage.ts
    feature-storage.ts

  /workers
    process-video-worker.ts
    build-track-profile-worker.ts

/python
  extract_frames.py
  normalize_frames.py
  extract_features.py
  match_reference.py

/docs
  features/GOPRO_LAP_SPLIT_DETECTION.md
```

---

## Processing Stages

## Stage 1: Video Import

### Goal

Import a video and extract useful metadata.

### Inputs

- GoPro MP4 file

### Outputs

- `ImportedVideo`
- Frame timestamp metadata
- Optional telemetry samples

### Requirements

- Preserve accurate timestamps.
- Do not rely only on frame number.
- Handle variable frame rate if present.
- Store original file unchanged.

### Initial implementation

Use `ffprobe`/`ffmpeg` to extract:

- Duration
- Resolution
- Frame rate
- Frame timestamps
- Audio availability
- Metadata tracks if available

### Acceptance criteria

- Given a video file, system creates an `ImportedVideo`.
- Duration and resolution are correct.
- A video can be re-opened and processed later.

---

## Stage 2: Frame Extraction

### Goal

Extract sampled frames from the video for matching.

### Suggested sampling rate

Start with:

```text
5 frames per second
```

This means one frame every 200 ms.

For higher accuracy later, increase to:

```text
10 frames per second
```

### Output

```ts
type ExtractedFrame = {
  videoId: string;
  timestampMs: number;
  framePath: string;
};
```

### Notes

Do not extract every frame for the MVP. It will be expensive and unnecessary.

### Acceptance criteria

- Given a 60-second video, at 5 fps, approximately 300 frames are extracted.
- Each frame has a timestamp.
- Frame paths are persisted.

---

## Stage 3: Frame Normalization

### Goal

Make frames easier to compare across sessions.

### Operations

For each frame:

1. Resize to standard resolution.
2. Crop to a stable region.
3. Normalize brightness/contrast.
4. Optionally undistort fisheye lens.
5. Optionally apply stabilization.

### Recommended MVP crop

Start with a configurable crop that ignores:

- Top 15%
- Bottom 20%

The exact crop should be user-adjustable later.

### Why crop?

The full frame may include:

- Sky or ceiling
- Steering wheel
- hands
- kart nose
- other racers
- helmet movement
- visor edges

The useful area is usually the middle area containing:

- track edges
- barriers
- curbs
- walls
- permanent signs
- corner geometry

### Acceptance criteria

- Normalized frames are visually consistent.
- Crop settings are configurable per track profile.
- Original frames are preserved.

---

## Stage 4: Reference Lap Creation

### Goal

Allow the user to manually create a reusable reference lap.

### User actions

The user should be able to:

1. Open a video.
2. Scrub through the video.
3. Mark start/finish frame.
4. Mark finish frame.
5. Optionally mark split points.
6. Save track profile.

### Required UI

Reference lap editor:

- Video player
- Frame stepping controls
- "Mark Start/Finish" button
- "Mark Split" button
- "Mark Finish" button
- Split list
- Thumbnail preview for each split
- Save profile button

### Reference progress calculation

If the user marks:

```text
start timestamp = 10,000 ms
finish timestamp = 52,000 ms
```

Then reference lap duration is:

```text
42,000 ms
```

For a sampled reference frame:

```ts
progress = (frameTimestampMs - startMs) / (finishMs - startMs)
```

Clamp to `0.0` through `1.0`.

### Acceptance criteria

- User can define a reference lap.
- User can add, rename, and remove splits.
- Saved splits are stored as `progress`, not timestamps.
- Track profile can be reused on another video.

---

## Stage 5: Reference Fingerprint Generation

### Goal

Create searchable visual fingerprints for the reference lap.

### For each sampled reference frame, compute:

1. Perceptual hash
2. Scene embedding
3. Local visual features
4. Optional telemetry snapshot

### MVP approach

Start simple:

- Use image embeddings if available.
- Use ORB feature descriptors through OpenCV.
- Store thumbnails for debugging.

Do not over-optimize initially.

### ReferencePoint generation

```ts
const referencePoint: ReferencePoint = {
  id,
  trackProfileId,
  timestampMs,
  progress,
  framePath,
  thumbnailPath,
  perceptualHash,
  embedding,
  localFeaturePath,
};
```

### Acceptance criteria

- Reference lap creates many `ReferencePoint` records.
- Each reference point has a progress value.
- Each reference point can be inspected in the UI.
- Matching data can be loaded without reprocessing the video.

---

## Stage 6: New Video Matching

### Goal

For each sampled frame in a new video, estimate where it is on the reference lap.

### Input

- New video frames
- Existing `TrackProfile`
- Existing `ReferencePoint[]`

### Output

- `ProcessedFrame[]` with candidate matches

### Candidate match generation

For each new frame:

```ts
const candidates = referencePoints
  .map((ref) => ({
    referencePointId: ref.id,
    progress: ref.progress,
    visualScore: compareVisualSimilarity(frame, ref),
    featureScore: compareLocalFeatures(frame, ref),
    telemetryScore: compareTelemetry(frame, ref),
  }))
  .map((candidate) => ({
    ...candidate,
    finalScore: combineScores(candidate),
  }))
  .sort((a, b) => b.finalScore - a.finalScore)
  .slice(0, 10);
```

### Example combined score

```ts
finalScore =
  0.50 * visualScore +
  0.30 * featureScore +
  0.15 * telemetryScore +
  0.05 * motionScore;
```

For the MVP, if some scores are unavailable, normalize the weights across available scores.

### Acceptance criteria

- Each processed frame receives top candidate progress values.
- Candidate list can be debugged.
- Low-quality matches are not silently accepted.

---

## Stage 7: Sequence Alignment

### Goal

Choose the most likely progress path through all frames.

Visual matching alone is not enough. Individual frames can match the wrong corner.

The progress path should normally move forward:

```text
0.10 -> 0.12 -> 0.15 -> 0.19
```

It should reject impossible jumps:

```text
0.10 -> 0.72 -> 0.14
```

### MVP sequence rules

For each frame, prefer candidates that:

1. Have high visual score.
2. Move forward relative to the previous selected progress.
3. Do not jump too far in too little time.
4. Only wrap from near `1.0` back to near `0.0`.
5. Respect minimum lap time.

### Suggested constants

```ts
const MIN_LAP_TIME_MS = 25_000;
const MAX_PROGRESS_JUMP_PER_SECOND = 0.12;
const WRAP_START_THRESHOLD = 0.90;
const WRAP_END_THRESHOLD = 0.10;
```

These should be configurable per track.

### Simple path selection pseudocode

```ts
let selected = [];

for (const frame of processedFrames) {
  const previous = selected[selected.length - 1];

  const ranked = frame.candidateMatches
    .map((candidate) => {
      const sequencePenalty = calculateSequencePenalty(previous, candidate, frame);
      return {
        ...candidate,
        sequenceScore: candidate.finalScore - sequencePenalty,
      };
    })
    .sort((a, b) => b.sequenceScore - a.sequenceScore);

  selected.push({
    timestampMs: frame.timestampMs,
    estimatedProgress: ranked[0].progress,
    confidence: ranked[0].sequenceScore,
  });
}
```

### Better future approach

Replace the greedy selector with:

- Dynamic Time Warping
- Hidden Markov Model
- Viterbi-style best path search

But do not start there unless MVP matching is unusable.

### Acceptance criteria

- Progress should move smoothly through the lap.
- Wraparound should happen only at start/finish.
- Obvious impossible jumps should be rejected.
- Debug view should show raw match vs sequence-adjusted match.

---

## Stage 8: Lap Detection

### Goal

Detect lap start and end times from progress wraparound.

### Rule

A lap boundary occurs when:

```ts
previousProgress > 0.90 &&
currentProgress < 0.10 &&
timeSinceLastLap > MIN_LAP_TIME_MS &&
confidenceIsGood
```

### Pseudocode

```ts
function detectLapBoundaries(frames: ProcessedFrame[]): LapBoundary[] {
  const boundaries: LapBoundary[] = [];

  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const curr = frames[i];

    const didWrap =
      prev.estimatedProgress !== undefined &&
      curr.estimatedProgress !== undefined &&
      prev.estimatedProgress > 0.90 &&
      curr.estimatedProgress < 0.10;

    const enoughTimeSinceLast =
      boundaries.length === 0 ||
      curr.timestampMs - boundaries[boundaries.length - 1].timestampMs > MIN_LAP_TIME_MS;

    const confidenceGood =
      (prev.confidence ?? 0) > 0.65 &&
      (curr.confidence ?? 0) > 0.65;

    if (didWrap && enoughTimeSinceLast && confidenceGood) {
      boundaries.push({
        timestampMs: interpolateWrapTime(prev, curr),
        confidence: Math.min(prev.confidence ?? 0, curr.confidence ?? 0),
      });
    }
  }

  return boundaries;
}
```

### Acceptance criteria

- Laps are detected from repeated progress wraparound.
- False laps are avoided using minimum lap time.
- User can review and correct lap boundaries.

---

## Stage 9: Split Detection

### Goal

Detect when a lap crosses each configured split point.

### Rule

For each split:

```ts
previousProgress < split.progress &&
currentProgress >= split.progress
```

Then interpolate between the two frame timestamps.

### Pseudocode

```ts
function detectSplitCrossing(
  previousFrame: ProcessedFrame,
  currentFrame: ProcessedFrame,
  splitProgress: number
): number | null {
  const p0 = previousFrame.estimatedProgress;
  const p1 = currentFrame.estimatedProgress;

  if (p0 === undefined || p1 === undefined) return null;
  if (!(p0 < splitProgress && p1 >= splitProgress)) return null;

  const progressDelta = p1 - p0;
  if (progressDelta <= 0) return null;

  const ratio = (splitProgress - p0) / progressDelta;
  return previousFrame.timestampMs +
    ratio * (currentFrame.timestampMs - previousFrame.timestampMs);
}
```

### Example

```text
frame A: 15.000s, progress 0.194
frame B: 15.200s, progress 0.207
split:   0.200
```

```text
split time = 15.000 + ((0.200 - 0.194) / (0.207 - 0.194)) * 0.200
split time = 15.092s
```

### Acceptance criteria

- Splits are calculated from progress crossings.
- Interpolation is used instead of rounding to nearest frame.
- User can review and correct split detections.

---

## Stage 10: Lap Comparison

### Goal

Compare two laps by split deltas and continuous progress delta.

### Basic output

For each lap:

```ts
type LapComparison = {
  referenceLapId: string;
  comparedLapId: string;
  totalDeltaMs: number;
  splitDeltas: SplitDelta[];
};
```

```ts
type SplitDelta = {
  splitPointId: string;
  referenceElapsedMs: number;
  comparedElapsedMs: number;
  deltaMs: number;
};
```

### Example

```text
Split 1: -0.170s  gained 0.170s
Split 2: +0.270s  lost 0.270s
Split 3: -0.250s  gained 0.250s
Finish:  -0.300s  gained 0.300s overall
```

### Continuous delta

Future improvement:

Generate a graph:

```text
trackProgress -> timeDeltaVsReference
```

This allows the user to see where time was gained or lost throughout the entire lap, not only at split points.

### Acceptance criteria

- User can select two laps.
- System displays total lap delta.
- System displays split-by-split deltas.
- System clearly shows gained/lost time.

---

## User Interface Requirements

## Track Profile Page

Should show:

- Track name
- Reference video
- Split list
- Reference lap thumbnails
- Edit splits
- Delete profile
- Rebuild fingerprints

## Reference Lap Editor

Should include:

- Video player
- Frame stepping
- Current timestamp
- Mark start/finish
- Mark split
- Mark finish
- Split list
- Thumbnail previews
- Save button

## Video Processing Page

Should show:

- Imported video
- Selected track profile
- Processing status
- Detected laps
- Detection confidence
- Low-confidence warnings

## Lap Review Page

Should show:

- Detected lap boundaries
- Detected split crossings
- Reference frame vs detected frame comparison
- Accept correction
- Adjust marker
- Reprocess with correction

## Lap Compare Page

Should show:

- Lap selector
- Total lap time
- Split table
- Delta table
- Optional delta graph
- Optional synchronized video playback

---

## Debug Views

Debugging is essential for this project.

Build debug tools early.

### Frame match debug view

For a selected processed frame, show:

- Current frame
- Top 5 reference matches
- Scores for each candidate
- Chosen match
- Estimated progress
- Confidence

### Progress graph

Show:

```text
timestamp -> estimatedProgress
```

This should look like a rising sawtooth:

```text
0.0 → 1.0
0.0 → 1.0
0.0 → 1.0
```

If it has random jumps, matching is broken.

### Confidence graph

Show:

```text
timestamp -> confidence
```

Use it to identify parts of the video where the camera was blocked or matching failed.

---

## Confidence Scoring

Each processed frame, lap boundary, and split crossing should have confidence.

### Frame confidence

Based on:

- Top visual match score
- Gap between best and second-best match
- Local feature match strength
- Sequence consistency
- Telemetry agreement, if available

### Split confidence

Can be calculated from:

- Confidence of frames surrounding the crossing
- Smoothness of progress near crossing
- Match quality around the split

### Lap confidence

Can be calculated from:

- Confidence near start boundary
- Confidence near finish boundary
- Lap duration plausibility
- Progress smoothness across lap

### Example

```text
Lap 4:
  Start: 0.97
  Split 1: 0.92
  Split 2: 0.61 warning
  Split 3: 0.94
  Finish: 0.96
```

Low-confidence results should be reviewable instead of trusted blindly.

---

## Correction Workflow

The user should be able to correct bad detections.

### Correcting a lap boundary

1. User opens detected lap.
2. User drags start or finish marker to correct frame.
3. System saves correction.
4. System recalculates lap and split times.

### Correcting a split

1. User opens split review.
2. User compares reference frame and detected frame.
3. User chooses correct frame.
4. System saves corrected crossing.
5. System recalculates deltas.

### Learning from correction

Later, corrections can update the track profile:

- Add stronger fingerprints around corrected split.
- Mark false-positive reference matches.
- Improve confidence scoring.

For MVP, just save corrections and use them in results.

---

## Storage Recommendations

### Database tables or collections

```text
videos
track_profiles
split_points
reference_points
processed_frames
lap_results
split_times
manual_corrections
```

### File storage

```text
/data
  /videos
    /original
    /normalized

  /frames
    /video-{id}
      raw/
      normalized/
      thumbnails/

  /features
    /track-{id}
      reference-points/
      descriptors/

  /exports
```

---

## LapViewer integration

This section maps the generic design above onto LapViewer's existing local-first stack. **Do not start M3-LV+ implementation work orders until the progress-curve spike passes** (see [Progress-curve spike](#progress-curve-spike)).

### LapViewer baseline

What already exists vs what this design adds:

| Area | LapViewer today | Relevance to 3B |
|------|-----------------|-----------------|
| Video import | Sessions registered by path ([PERSISTENCE.md](../PERSISTENCE.md)); ffprobe metadata | Replaces generic `ImportedVideo` |
| Frame extraction | ffmpeg + scan cache in `lapDetection.ts` (`DATA_DIR/cache/lap-detect-fps*`) | Covers generic Stages 1–2 |
| Markers | `markers` table: `lapStart` / `split` per session | Source of truth for lap/split times in UI |
| Tracks | `tracks` + `track_splits` (name + `splitIndex`; **no `progress` yet**) | Partial `SplitPoint`; needs reference profile |
| Assisted detection (3A) | `detection_profiles`, `detection_bank`, Intake auto-detect ([AUTO_LAP_DETECTION_V1.md](AUTO_LAP_DETECTION_V1.md)) | ROI-NCC lap starts; AD-5 splits next |
| Compare | 2-up sync at lap or split markers ([ComparePage.tsx](../../client/src/pages/ComparePage.tsx)) | M6-LV extends here, not a new app |

Generic **Milestone 1** (import + frame extraction) is **skipped** — use existing F1 + detection scan infra.

---

### LapViewer data model mapping

Greenfield types from [Main Data Models](#main-data-models) map to LapViewer as follows.

| Generic type | LapViewer mapping | Notes |
|--------------|-------------------|-------|
| `ImportedVideo` | `sessions` row + `sourcePath` | Path-only; no video blobs in SQLite |
| `TrackProfile` | `tracks` + new `track_reference_profiles` (1:1) | See schema below |
| `SplitPoint.progress` | `track_splits.progress REAL` | Nullable until reference lap calibrated |
| `ReferencePoint[]` | `track_reference_points` table + files under `DATA_DIR/cache/features/` | Fingerprints cached on disk |
| `ProcessedFrame[]` | Job-scoped cache dir per match job | Not permanent SQLite rows (except debug export) |
| `LapResult` / `SplitTime` | **Derived from `markers`** | No parallel lap-results table in v1 |
| Detection proposals | Extend detection job model (like AD-3) | Proposals in job payload; accept → `markers` |

#### `track_reference_profiles` (proposed)

One row per track (`trackId` UNIQUE, FK → `tracks`, CASCADE delete). Scoped by `tracks.userId`.

| Column | Purpose |
|--------|---------|
| `id` | Stable profile ID |
| `trackId` | Parent track |
| `referenceSessionId` | Session containing the reference lap |
| `referenceLapNumber` | Which lap in that session (1-based) |
| `referenceStartMarkerId` | Optional FK to start `lapStart` marker |
| `referenceEndMarkerId` | Optional FK to end boundary (lap N+1 start or session end) |
| `cropTop`, `cropBottom`, `cropLeft`, `cropRight` | Normalized crop fractions (Stage 3) |
| `direction` | `clockwise` \| `counterclockwise` \| `unknown` |
| `scanFps` | Frame sampling for matching (default 5) |
| `minLapTimeMs`, `maxProgressJumpPerSec` | Sequence-alignment tunables |
| `lapBoundaryConfidenceMin` | Default 0.65 |
| `splitConfidenceMin` | Default 0.61 (warning threshold) |
| `createdAt`, `updatedAt` | Audit |

#### `track_reference_points` (proposed)

| Column | Purpose |
|--------|---------|
| `id` | Stable point ID |
| `profileId` | FK → `track_reference_profiles` |
| `timestampMs` | Time in reference video |
| `progress` | 0.0–1.0 on reference lap |
| `featurePath` | Relative path under `DATA_DIR/cache/features/` |
| `perceptualHash` | Optional pHash string |
| `createdAt` | Audit |

#### `track_splits` extension

Add nullable `progress REAL` — canonical split location on the reference lap. Session `split` markers remain timestamp instances; `progress` is the reusable definition.

#### Mapping decisions (resolved)

1. **Start/finish progress:** Reference lap is always normalized **0.0 at lap start, 1.0 at lap end** (next lap start or user-marked finish). No sub-range profiles in v1.
2. **Split storage:** `track_splits.progress` is canonical; per-session `markers` (`kind: split`) store detected/confirmed times. Data and Compare continue to read markers.
3. **Ownership:** Reference profile inherits `tracks.userId` ([ROADMAP.md](../ROADMAP.md) — tracks per-user).

Full schema draft: [PERSISTENCE.md](../PERSISTENCE.md) §Reference-lap detection (Phase 3B).

---

### Relationship to Phase 3A (`detection_profiles`)

[AUTO_LAP_DETECTION_V1.md](AUTO_LAP_DETECTION_V1.md) delivers ROI + NCC lap-start detection (AD-1..AD-4 done). Three convergence paths:

| Path | When | Behavior |
|------|------|----------|
| **A — Sequential** *(default)* | Per [ROADMAP.md](../ROADMAP.md) | Finish **AD-5** (NCC split keyframes from `vision-auto-splits.mjs`) first; start 3B with progress-curve spike |
| **B — Bootstrap** | Reference lap + lap-1 splits exist | Seed `track_reference_points` and `track_splits.progress` from confirmed lap-1 markers; `detection_bank` entries become additional feature sources at known progress |
| **C — Replace** | Progress curve reliable on real footage | Lap boundaries from progress wraparound replace periodic NCC walk; `detection_bank` retained for SF-line refinement only |

**AD-5 vs reference points:** AD-5 split templates stay on the NCC path until M5-LV. When a reference profile is built, confirmed split keyframes from lap 1 are **promoted** to `track_reference_points` at the computed `progress` — they do not remain a separate mechanism long term.

---

### UI mapping (three forms)

Generic design pages map to existing LapViewer surfaces:

| Generic surface | LapViewer home | Acceptance (wireframe level) |
|-----------------|----------------|--------------------------------|
| Reference lap editor | **Intake** — "Set reference lap" mode when track selected | User marks reference lap start/end + splits on one lap; saves profile; shows progress % per split |
| Track profile / split list | **Intake** track panel + **Data** track edit | Split names + progress % + thumbnail; extend [trackSplits API](../../server/src/services/trackSplits.ts) |
| Video processing + progress graph | **Intake** side panel (reuse `DetectionReviewPanel` pattern) | Job progress; live progress graph (`timestamp → progress`); low-confidence segments highlighted |
| Lap/split review | **Intake** same panel — review mode | Keyboard walk proposals; accept → persist markers + optional bank/reference point |
| Split delta table | **Compare** header/dock | Sector delta table for two selected laps; sync point selector unchanged |

No new top-level routes beyond `/`, `/intake`, `/compare`.

---

### API and background jobs

Mirrors AD-3 job pattern. Proposals are **not** auto-persisted; accept uses existing marker create/PATCH.

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/api/tracks/:trackId/reference-profile` | Create/update reference bounds, crop, direction, tunables |
| `GET` | `/api/tracks/:trackId/reference-profile` | Read profile + split progress list |
| `POST` | `/api/tracks/:trackId/reference-profile/build` | Sample reference lap → `track_reference_points[]` (background job) |
| `POST` | `/api/sessions/:sessionId/match-track` | Start progress-matching job; body `{ trackId }` → `{ jobId }` |
| `GET` | `/api/match-track/:jobId` | `{ status, progress, curveSamples?, proposals?, lowConfidenceRanges?, error? }` |
| `DELETE` | `/api/match-track/:jobId` | Cancel job |
| `POST` | `/api/sessions/:sessionId/match-track/:jobId/accept` | Accept proposal(s) → `markers` (+ optional reference point append) |

**Job outputs:**

- `curveSamples`: `{ timestampMs, estimatedProgress, confidence }[]` for debug graph
- `proposals`: `{ kind: lapStart \| split, timeSeconds, splitIndex?, confidence }[]`
- `lowConfidenceRanges`: `{ startMs, endMs, avgConfidence }[]` for review hints

Frame/thumbnail endpoints reuse existing `GET /api/sessions/:id/frame?t=&roi=`.

---

### Progress-curve spike

Formal gate before M3-LV implementation. Work order: [WO-gopro-progress-spike](../work-orders/WO-gopro-progress-spike.md).

**Goal:** On one known session (e.g. Sweeper / `GX010012`), given a manually marked reference lap:

1. Extract 5 fps normalized frames (reuse `detection_profiles` ROI or wider configurable crop)
2. Build reference points with **NCC patches or pHash** (Node + sharp — no Python/OpenCV in spike)
3. Match a **second lap in the same video** frame-by-frame
4. Run greedy sequence alignment (Stage 7 MVP rules)
5. Emit `timestamp → progress` samples; inspect sawtooth plot (script or JSON export)

**Go gate (proceed to M3-LV):**

- Progress mostly monotonic within each lap
- Wraparound only near start/finish (0.9 → 0.1)
- Top-5 candidate match contains correct progress on ≥70% of sampled frames (same-session test)

**No-go:** Revise fingerprints or escalate to DTW/HMM (Stage 7 future path); continue 3A NCC-only path for lap/split marking.

**Stack:** Node + ffmpeg + sharp per [ARCHITECTURE.md](../ARCHITECTURE.md). Python/OpenCV requires explicit approval if spike fails on Node-only fingerprints.

#### Spike implementation status

| Item | Status |
|------|--------|
| Design + go-gate | Done |
| Script [`gopro-progress-spike.mjs`](../../server/scripts/gopro-progress-spike.mjs) | Done |
| [WO-gopro-progress-spike](../work-orders/WO-gopro-progress-spike.md) | WO-01 Done; WO-02 review open |
| Go/no-go result | **GO** on `GX010012.MP4` (2026-07-06) |

**Spike run (`GX010012.MP4`, auto-detected lap bounds, lap 1 → lap 2):**

| Metric | Result | Gate |
|--------|--------|------|
| Top-5 hit rate | **95.7%** | ≥ 70% |
| Monotonicity violation rate | **7.3%** (10/137) | ≤ 10% |
| Progress wraps | 0 (single-lap target; N/A) | SF only |

Output: `data/cache/gopro-progress-spike-{sessionId}.json`. Fingerprint: full **track crop** grayscale NCC (top 15% / bottom 20% masked); lap bounds via flag-ROI auto-detect when DB has no markers (`AUTO_LAPS=1`, `ANCHOR_S=100`).

**Recommendation:** Proceed to **M2-LV** (reference profile persistence + Intake editor). M3-LV product work can reuse spike matching logic.

---

### Compare and split deltas (M6-LV)

Extends [ComparePage.tsx](../../client/src/pages/ComparePage.tsx) — does not replace lap-start sync.

**Input:** Two laps from Compare tray, same track (cross-session OK per D-009), both with split markers where track defines splits.

**Segment math:** Reuse [client/src/utils/splits.ts](../../client/src/utils/splits.ts):

- `splitSegmentMs(split, lapStart, priorSplit)` — sector duration
- `tailSegmentMs(lapStart, lapEnd, lastSplit)` — final sector to lap end

**Delta table** (below Compare header or above panes):

| Sector | Lap A | Lap B | Δ |
|--------|-------|-------|---|
| Split 1 → Split 2 | 12.340 | 12.510 | +0.170 lost |
| … | | | |
| Total lap | 1:42.356 | 1:42.656 | +0.300 lost |

- Format: `m:ss.mmm` per [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md) §2.4
- **Sync behavior:** User may sync from any lap start or split marker; delta table always shows **cumulative sector deltas from lap start** (design Stage 10 example)
- **Cross-session:** Requires same `trackId` and aligned `track_splits.splitIndex` slots (progress optional for display but required for auto-detection)

Resolves [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md) §2.1: sector/split markers are **in scope** for 3B compare deltas; lap definition remains start/finish crossings.

Data lap-row sector columns deferred (Q6).

---

### Correction workflow (M7-LV)

Generic correction flow maps to existing marker APIs:

1. User opens detected lap/split in Intake review panel
2. **Drag or nudge** marker → `PATCH /api/markers/:id` (existing)
3. Client **recomputes** lap list and split segment times (existing derived-lap logic)
4. Compare delta table updates on next open
5. **No `manual_corrections` table in v1** — corrected times live in `markers` only

**Optional post-M7:** Append corrected frame to `track_reference_points` or `detection_bank` for learning (not MVP).

**Confidence tunables:** `lapBoundaryConfidenceMin` (default 0.65), `splitConfidenceMin` (default 0.61 warning) on `track_reference_profiles` — per track, not global.

Review keyboard map: reuse AD-3 shortcuts where applicable (`,/.` walk, `Y` accept, `X` reject, `[/]` nudge).

---

### Resolved decisions (LapViewer)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Vision stack | **Node + ffmpeg + sharp first**; Python/OpenCV opt-in only if spike fails |
| Q2 | Reference profile storage | New **`track_reference_profiles`** table, 1:1 with `tracks` |
| Q3 | Split canonical form | **`track_splits.progress`** canonical; session **`markers`** are instances |
| Q4 | 3A vs 3B sequencing | **AD-5 first**; progress spike may run in parallel if capacity |
| Q5 | Output persistence | Proposals in job payload; **accepted → `markers`** only in v1 |
| Q6 | Compare deltas UI | **Compare split delta table first**; Data lap columns later |

Recorded in [DECISIONS.md](../DECISIONS.md) as **D-019–D-024**.

---

## LapViewer MVP roadmap (M2-LV – M7-LV)

Rebased milestones for Phase 3B. Generic M1 skipped (import/frames exist).

### M2-LV — Reference lap profile *(partial baseline)*

**Build:**

- `track_reference_profiles` + `track_splits.progress` schema
- Intake "Set reference lap" mode: mark start, splits, end on one lap
- Save profile; compute progress for each split

**Done when:**

- User can define a reusable reference lap on a track
- Splits stored as `progress` on `track_splits`, not only timestamps
- Reference session + lap number persisted on profile

**LapViewer status:** Done — schema, API, Intake Reference tab ([`ReferenceLapPanel.tsx`](../../client/src/components/ReferenceLapPanel.tsx))

---

### M3-LV — Basic visual matching *(spike-gated)*

**Build:**

- Frame normalization (crop settings on profile)
- Reference point generation (pHash or NCC patches)
- Per-frame candidate match against reference points
- Debug match viewer (top-5 candidates + scores)

**Done when:**

- Spike go-gate passes on same-session test footage
- Random frame shows correct progress in top-5 often enough to proceed

**Blocked by:** [WO-gopro-progress-spike](../work-orders/WO-gopro-progress-spike.md) — **passed (GO)**

**LapViewer status:** Done — `track_reference_points`, build job, NCC fingerprints ([`trackProgressVision.ts`](../../server/src/services/trackProgressVision.ts), [`TrackMatchPanel.tsx`](../../client/src/components/TrackMatchPanel.tsx))

---

### M4-LV — Sequence alignment

**Build:**

- Greedy progress path selection (Stage 7 MVP)
- Forward-movement constraints + wraparound handling
- Progress graph in Intake job panel

**Done when:**

- Processed video produces a mostly clean sawtooth progress graph
- Obvious impossible jumps filtered

**LapViewer status:** Done — [`trackProgressMath.ts`](../../server/src/services/trackProgressMath.ts) greedy align + SVG progress graph in Reference tab

---

### M5-LV — Lap and split detection

**Build:**

- Lap boundaries from progress wraparound
- Split crossings from `track_splits.progress` interpolation
- Proposals with confidence → marker accept flow

**Done when:**

- System outputs lap and split times as reviewable proposals
- Accept persists `lapStart` / `split` markers

**LapViewer status:** Done — match job + accept API + proposal review in [`TrackMatchPanel.tsx`](../../client/src/components/TrackMatchPanel.tsx)

---

### M6-LV — Lap comparison deltas

**Build:**

- Compare split delta table
- Total lap delta row
- Works cross-session on same track

**Done when:**

- User compares two laps and sees sector-by-sector gained/lost time

**LapViewer status:** Done — [`CompareSplitDeltaTable.tsx`](../../client/src/components/CompareSplitDeltaTable.tsx)

---

### M7-LV — Correction workflow

**Build:**

- Low-confidence warnings in review panel
- Marker nudge/correct via existing PATCH API
- Re-run comparison with corrected markers

**Done when:**

- Bad detections fixable without full re-import
- Corrected markers used in Compare deltas

**LapViewer status:** Done — low-confidence range warnings in match panel; marker nudge via existing Intake/Compare PATCH flows

---

## MVP Roadmap (generic reference)

The milestones below are the **original greenfield checklist**. LapViewer uses [M2-LV – M7-LV](#lapviewer-mvp-roadmap-m2-lv--m7-lv) instead.

## Milestone 1: Import and inspect video

### Build

- Video import
- Metadata extraction
- Frame extraction at 5 fps
- Basic video browser

### Done when

- User can import a GoPro video.
- Frames can be extracted.
- Frames can be viewed by timestamp.

---

## Milestone 2: Create a track profile

### Build

- Reference lap editor
- Manual start/finish marking
- Manual split marking
- Save `TrackProfile`
- Generate `ReferencePoint[]`

### Done when

- User can create and save a reusable track profile.
- Splits are stored as progress values.

---

## Milestone 3: Basic visual matching

### Build

- Frame normalization
- Visual fingerprint generation
- Reference matching
- Candidate match storage
- Debug match viewer

### Done when

- For a random video frame, system can show top reference matches.
- Correct match is often in top 5.

---

## Milestone 4: Sequence alignment

### Build

- Smooth progress path selection
- Forward movement constraints
- Wraparound handling
- Progress graph

### Done when

- Processed video produces a mostly clean sawtooth progress graph.
- Obvious false jumps are filtered.

---

## Milestone 5: Lap and split detection

### Build

- Lap boundary detection
- Split crossing detection
- Interpolation
- Lap result storage

### Done when

- System outputs lap times.
- System outputs split times.
- Results can be reviewed.

---

## Milestone 6: Lap comparison

### Build

- Lap selector
- Split delta table
- Total delta
- Basic visualization

### Done when

- User can compare two laps.
- User can see where time was gained or lost.

---

## Milestone 7: Correction workflow

### Build

- Manual correction of lap boundaries
- Manual correction of split crossings
- Confidence warnings
- Correction persistence

### Done when

- Bad detections can be fixed without redoing the whole workflow.
- Corrected results are used in comparisons.

---

## Implementation Notes for Cursor Agent

Start with the data model and pipeline skeleton before optimizing computer vision.

Recommended order:

1. Create domain models.
2. Create file storage layout.
3. Implement video import.
4. Implement frame extraction.
5. Build reference lap editor.
6. Store track profile and split progress.
7. Implement simple image similarity.
8. Add debug viewer for candidate matches.
9. Add sequence smoothing.
10. Add lap/split detection.
11. Add correction workflow.

Do not start by building a complex ML model.

The first successful prototype should be able to answer:

> Given a reference lap and a new video, can we estimate a rough progress curve that moves from 0 to 1 for each lap?

Everything else depends on that.

---

## Initial Technical Choices

These are suggestions, not hard requirements.

### Frontend

- React
- TypeScript
- Video player with frame stepping
- Canvas overlays for split markers
- Charts for progress/confidence

### Backend

- Node/TypeScript for orchestration (**default** — matches [ARCHITECTURE.md](../ARCHITECTURE.md))
- Python worker for OpenCV/video processing — **opt-in only** if Node spike fails (see Q1)
- SQLite under `DATA_DIR` for metadata
- Path-only videos + `DATA_DIR/cache` for frames/features

### Vision tools

- FFmpeg/ffprobe for video metadata and frame extraction (already in use)
- sharp for crop/grayscale/NCC in Node (already in use for AD-1)
- OpenCV / ORB — deferred unless spike requires it
- Optional image embedding model later
- Optional GoPro telemetry extraction later

---

## Risks

### Risk: Different camera angle between sessions

Mitigation:

- Crop configurable area.
- Use local features and sequence smoothing.
- Allow user correction.

### Risk: Other karts block the view

Mitigation:

- Use confidence scoring.
- Use sequence alignment.
- Let short bad sections be inferred from surrounding frames.

### Risk: Similar-looking corners

Mitigation:

- Sequence constraints.
- Use multiple frames over time.
- Compare motion pattern, not only single frames.

### Risk: Indoor GPS unusable

Mitigation:

- Do not rely on GPS.
- Treat telemetry as optional.
- Make visual matching primary.

### Risk: Processing is slow

Mitigation:

- Start with 5 fps.
- Cache fingerprints.
- Process in background worker.
- Add higher precision only around splits/lap boundaries.

---

## Future Enhancements

### Higher precision pass

After approximate splits are found, process the nearby video region at a higher frame rate.

Example:

1. First pass: 5 fps across whole video.
2. Split found around 15.1 seconds.
3. Second pass: process 14.5s to 15.7s at full frame rate.
4. Refine split crossing.

### Synchronized lap video

Show two laps side-by-side:

- Reference lap video
- Compared lap video
- Same track progress
- Delta display

### Continuous time delta

Generate a delta curve across the whole lap:

```text
progress -> compared lap time minus reference lap time
```

### Automatic reference lap suggestion

For long videos, detect repeated visual cycles and suggest possible laps.

This should come after manual reference lap creation works.

### Telemetry fusion

If GoPro telemetry is available:

- Use GPS outdoors
- Use gyro to help identify corner direction
- Use accelerometer to detect braking and acceleration zones

### Track map visualization

Eventually, generate a simple map-like representation:

- Progress path
- Split markers
- Gained/lost time zones

---

## Key Acceptance Test

A useful early acceptance test:

1. Import a known GoPro session.
2. Manually create a reference lap.
3. Process another lap from the same session.
4. Generate progress over time.
5. Confirm progress forms a smooth sawtooth.
6. Detect start/finish.
7. Detect at least three split crossings.
8. Compare lap deltas.

If this works on same-session footage, then test across different sessions.

---

## Final Summary

The core architecture is:

```text
Reference lap creates a visual map of the track.
New video frames are matched to that map.
Sequence alignment turns noisy frame matches into smooth track progress.
Lap boundaries are progress wraparounds.
Splits are progress crossings.
Lap comparison is just timing deltas at those crossings.
```

The most important implementation target is not perfect visual recognition.

The most important target is:

```text
timestampMs -> estimatedTrackProgress
```

Once that mapping is reliable, the rest of the application becomes straightforward.
