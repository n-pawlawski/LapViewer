# WO — View & Compare v1 (mock)

**Status:** Ready  
**Date:** 2026-03-28  
**Branch:** `feature/view-compare-v1`  
**Spec:** [docs/features/VIEW_COMPARE_V1.md](../features/VIEW_COMPARE_V1.md)  
**Decision:** D-017

---

## Goal

Ship Data browsing + 2-up Compare using mock sessions/laps and the demo video stream — no SQLite or Intake yet.

---

## Phases

| ID | Deliverable | Done when |
|----|-------------|-----------|
| VC-1 | Shell + routes `/`, `/compare`, dark theme | Nav works; Intake stub OK |
| VC-2 | Data: mock list, lap table, compare tray | VC-2.1–VC-2.8 in spec |
| VC-3 | Compare: sync, freeze, mute | VC-3.1–VC-3.7 in spec |
| VC-4 | Tray persistence | Refresh Data keeps chips |

---

## Out of scope

- Intake, markers, SQLite (VC-5)
- 4-up grid (F5.3)
- Audio source picker
- Search/filters on Data

---

## Verification

```bash
npm run check
```

Manual: flows A and B in VIEW_COMPARE_V1.md.

---

## Supersedes

`WO-ui-shell.md` for first product slice — that WO was a generic static shell; this WO is compare-focused with playback.
