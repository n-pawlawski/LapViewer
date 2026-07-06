# Project Overview

## Vision

LapViewer is a **personal racing footage analysis tool**. It turns raw onboard or track-side video into structured lap data you can browse, compare, and replay — without needing professional telemetry software or manual stopwatch work.

The primary user today is **you**: a driver reviewing your own sessions to understand pace, consistency, and where time is gained or lost lap-to-lap.

**Long-term:** a hosted web app where drivers upload races and compare laps with others. See [Roadmap](ROADMAP.md) — deployment is deferred until core local features are solid.

## Problem

Race videos are long and unstructured. Finding a specific lap, knowing its time, and comparing it to another lap (from the same session or a different day) is tedious when done manually with a generic video player.

## Solution

A web app that:

1. Stores your race videos in an organized library.
2. Lets you annotate the timeline with lap markers.
3. Computes lap times from those markers.
4. Presents lap times in a browsable UI.
5. Plays selected laps in parallel (side-by-side or grid) for visual comparison.

## Typical video formats

Not every registered video will follow the same structure. The app should tolerate variation:

| Format | Description |
|--------|-------------|
| **Full session** | Pit exit → outlap → race laps → pit entry |
| **Race-only start** | Video begins mid-race; no pit/outlap footage |
| **Partial session** | Truncated start or end |
| **Unknown structure** | User marks laps manually regardless of format |

The lap-marking workflow is the **source of truth** for timing — the app should not assume a fixed video structure.

## Core user workflow

The app has three main forms — see [UI Forms](UI_FORMS.md) for full detail.

```
Data form (browse & select laps)
    → Intake form (new video + lap markers)
    → Data form (review lap times)
    → Comparison form (watch selected laps together)
```

1. **Data form** — Browse sessions and laps; select laps to compare; start new intake.
2. **Intake form** — Register a video from the library drive and mark lap boundaries on the timeline.
3. **Comparison form** — Play 2+ selected laps side-by-side or in a grid, synchronized.

## Success criteria (v1)

- [ ] Upload at least one video and persist it between sessions.
- [ ] Scrub/seek through video smoothly on a desktop browser.
- [ ] Add, edit, move, and delete lap-start markers on the timeline.
- [ ] See a lap list with computed times for a single race.
- [ ] Select 2–4 laps and play them synchronized in a comparison view.
- [ ] Works for your actual footage (720p–1080p, typical race length).

## Non-goals (v1 — local build)

These do not block the current local-first build:

- Live streaming or in-car real-time capture
- Mobile-native apps
- Telemetry overlay (speed, throttle, GPS trace) unless added later
- Video editing (cutting, transcoding beyond what storage requires)
- **Cloud deploy, upload pipeline, cross-user compare** — phased later; see [Roadmap](ROADMAP.md)

## Planned after v1 (see Roadmap)

- User accounts (dev account locally first, then real auth)
- Data form refactor (toolbar, organization, optional all-laps view)
- Assisted lap detection — [AUTO_LAP_DETECTION_V1.md](features/AUTO_LAP_DETECTION_V1.md)
- Hosted multi-user web app (upload + compare with others)

## Glossary

| Term | Meaning |
|------|---------|
| **Session / Race** | One registered video file and its associated metadata and lap markers |
| **Lap marker** | A timestamp on the video timeline marking where a lap begins |
| **Lap time** | Duration from one lap-start marker to the next (or to a defined end marker) |
| **Comparison view** | Multi-pane player showing 2+ lap segments playing in sync |
| **Outlap** | First lap after leaving the pit, often not counted as a timed race lap |
