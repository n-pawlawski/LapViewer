# View & Compare Laps — v1 Design

**Status:** Ready for implementation (mock-data phase first)  
**Date:** 2026-03-28  
**Owner:** Product design pass  
**Related:** [UI_FORMS.md](../UI_FORMS.md), [UI_DESIGN.md](../UI_DESIGN.md), [FEATURES.md](../FEATURES.md) (F4, F5), [DECISIONS.md](../DECISIONS.md) (D-006–D-010)

---

## Intent

Give the user a **Data home screen** to browse sessions and lap times, select laps (including across sessions), and open a **2-up Comparison** view with synchronized playback from each lap’s start marker.

**Out of scope for this v1 build slice:** Intake, SQLite, real marker editing, 3–4 lap grid, audio swap, delta overlays.

---

## User goals

1. See what races/sessions exist and their lap times at a glance.
2. Pick two laps (same or different sessions) without losing prior selections.
3. Watch both lap segments in sync to compare line and pace.
4. Return to Data to change selection.

---

## User flows

### Flow A — Compare two laps from one session

```text
Data (/) → select Session A → check Lap 3 and Lap 7
        → Compare tray shows 2 laps → [Compare selected]
        → Compare (/compare) → play/pause/scrub → [← Data]
```

### Flow B — Cross-session compare

```text
Data → select Session A → check Lap 3
     → select Session B → check Lap 5 (Lap 3 stays checked)
     → Compare tray → [Compare selected] → Compare
```

### Flow C — Empty / edge

| State | UX |
|-------|-----|
| No sessions | Empty state + link to Intake (future); v1 mock always has sample data |
| Session, no laps | “No laps yet” + Open Intake (future) |
| 1 lap selected | Compare disabled: “Select at least 2 laps” |
| 5+ laps checked | Block new checks or replace oldest — **v1: block with message** (max 2 for first build, max 4 later) |

---

## Screens

### Data (`/`)

Two-pane layout per [UI_DESIGN.md](../UI_DESIGN.md).

**Left — session list**

- Title, filename, status, lap count, best lap.
- One row selected at a time.
- Search/filter deferred to v1.1.

**Right — selected session**

- Summary: title, file, status, best lap, lap count.
- **Lap table** columns: ☐ Select | Lap | Time | Δ best
- Best lap row: subtle highlight (accent border or badge).
- Row click: **selects session lap for checkbox toggle** (v1); no inline player on Data.

**Compare tray** (pinned bottom of right pane or full-width footer)

```text
Compare:  [Session A · Lap 3 · 1:40.1] [Session B · Lap 5 · 1:41.0]  [×] [×]
          [Compare selected (2)]   [Clear all]
```

- Each chip: `sessionTitle · Lap N · time`; remove via ×.
- Persists when switching sessions (**D-009**).
- `Compare selected` enabled when **exactly 2 laps** selected in **first build** (expand to 2–4 in F5.3 later).

**Header**

- `LapViewer` | Data | Intake | Compare
- `Add session` → Intake (stub route OK in mock phase)
- Compare tab: disabled or shows “select laps on Data” until 2 laps selected

### Comparison (`/compare`)

**Entry:** From Data with 2 laps in tray; URL may include `?laps=<id>,<id>` for refresh (mock IDs).

**Layout:** 2-up side-by-side per UI_DESIGN.

**Pane header (each):**

```text
Session Title · Lap 3 · 1:40.127
```

**Video:** One `<video>` per pane; source = session file stream (mock: same demo MP4 with different seek windows).

**Shared transport**

| Control | Behavior |
|---------|----------|
| Play / Pause | All **active** (non-frozen) panes together |
| Scrubber | **Comparison time** 0 → T_max; position = lap start + t |
| Time readout | `0:32.4 / 1:40.1` where denominator = **longer** of the two lap durations |
| Back to Data | Navigates to `/`; tray selection preserved |

**Sync model**

- `comparisonTime` = 0 at each lap’s **start marker** (mock: `startSeconds` on lap object).
- On play: each pane seeks to `startSeconds + comparisonTime` on each tick/frame.
- On scrub: set `comparisonTime` from slider; all panes seek.

**Shorter lap ends (D-008)**

- When `comparisonTime` ≥ lap duration for a pane: **freeze** that pane (pause, hold last frame).
- Other pane(s) continue until their end.
- Scrubber can still move past frozen pane’s end; frozen pane stays on last frame.

**Audio (D-007)**

- **Muted** on all panes in v1.

**Change selection in place**

- **Deferred v1.1.** User uses **Back to Data** to change laps.

---

## Data model (logical)

Used by UI whether mock or API-backed.

### Session

```ts
{
  id: string;
  title: string;
  sourcePath: string;
  status: "ready" | "missing" | "processing" | "error";
  track?: string;
  date?: string;       // ISO date
  lapCount: number;
  bestLapTimeMs?: number;
}
```

### Lap

```ts
{
  id: string;          // unique globally: `${sessionId}-lap-${n}`
  sessionId: string;
  lapNumber: number;   // 1-based; 0 = outlap excluded from compare
  startSeconds: number;
  endSeconds: number;  // next marker or video end
  lapTimeMs: number;
}
```

### Comparison selection

- Stored in **React context** or URL query for v1 mock.
- Persist tray in `sessionStorage` optional so refresh on Data keeps chips.

### Time display

- Format: **`m:ss.mmm`** (e.g. `1:40.127`).
- Delta to best: `−0.423` or `+1.201` on same session; cross-session delta optional v1.1.

---

## Mock data strategy (first implementation)

**Why mock first:** Prove Data + Compare UX before SQLite, intake, and marker APIs.

### Mock content

- **2–3 sessions** hardcoded in `client/src/mocks/sessions.ts`.
- **6–12 laps** per session with realistic times; at least one session shares the **demo video path** so Compare can stream `/api/video/demo`.
- Second session may use same demo file with different mock windows (honest label in UI: “demo” until real files wired).

### Mock lap windows for demo video

Use plausible `startSeconds` / `endSeconds` within demo clip duration (probe or assume 5+ min).

---

## Implementation phases

| Phase | Deliverable | Data source |
|-------|-------------|-------------|
| **VC-1** | App shell, routes `/`, `/compare`, dark theme | — |
| **VC-2** | Data screen: session list, lap table, compare tray (mock) | Mock TS |
| **VC-3** | Compare 2-up: sync playback, freeze shorter lap, muted | Mock laps + demo stream |
| **VC-4** | `sessionStorage` or URL for tray persistence | Mock |
| **VC-5** | Real sessions/laps API + SQLite | Server (later WO) |

**This design gates VC-1 through VC-4.** VC-5 is a separate work order.

---

## Acceptance criteria (testable)

### Data — view & select (F4 + F5.1)

- [ ] **VC-2.1** Session list shows ≥2 mock sessions with title, status, lap count, best lap.
- [ ] **VC-2.2** Selecting a session updates lap table on the right.
- [ ] **VC-2.3** Lap table shows lap number, time (`m:ss.mmm`), delta to session best.
- [ ] **VC-2.4** Best lap is visually distinct.
- [ ] **VC-2.5** Checking laps adds chips to compare tray; unchecking removes.
- [ ] **VC-2.6** Switching sessions **does not clear** tray selections from other sessions.
- [ ] **VC-2.7** With ≠2 laps selected, Compare action is disabled with short hint.
- [ ] **VC-2.8** With 2 laps selected, `Compare selected` navigates to `/compare`.

### Comparison — 2-up (F5.2)

- [ ] **VC-3.1** Two panes show correct session title, lap number, lap time.
- [ ] **VC-3.2** Play starts both at lap start (comparison time 0).
- [ ] **VC-3.3** Pause stops both active panes.
- [ ] **VC-3.4** Scrubbing updates both panes to same comparison time.
- [ ] **VC-3.5** When shorter lap ends, that pane freezes; longer continues.
- [ ] **VC-3.6** Audio muted.
- [ ] **VC-3.7** Back to Data preserves tray selection.

### Non-goals (v1 slice)

- Intake / register / markers UI (beyond stub nav).
- SQLite / persistence.
- 3–4 lap grid (F5.3).
- Filters, search, organize, delete.
- In-compare lap swap.
- Audio source picker.
- Delta overlay / ghost line (F5.4).

---

## Open questions — resolved for v1

| Question | Decision |
|----------|----------|
| First build: mock or real data? | **Mock** for VC-1–4 |
| Max laps in first compare build? | **2 only** (expand to 4 with F5.3) |
| Lap row click on Data | Toggles checkbox (same as clicking ☐) |
| Change selection on Compare | **Back to Data** (in-place swap deferred) |
| Intake layout | Single page (existing UI_DESIGN); not in VC slice |
| Time format | `m:ss.mmm` |
| Compare tab in header | Navigates to `/compare` only when 2 laps selected; else toast/hint |

---

## Traceability

| Spec | Features |
|------|----------|
| Data view/select | F4.1, F4.2, F5.1 |
| Compare 2-up | F5.2 |
| Later grid | F5.3 |
| Persistence | F6.1 (VC-5) |

---

## Verification (manual)

1. `npm run dev` — Data shows mock sessions and laps.
2. Select laps from two sessions; tray shows both.
3. Compare — both videos play in sync from lap starts.
4. Let shorter lap finish — verify freeze behavior.
5. Back to Data — tray unchanged.

---

## Next implementation step

Branch `feature/view-compare-v1`. Implement **VC-1 → VC-2 → VC-3** in order. Run `npm run check` after each phase.
