# WO — Persistence VC-5

**Status:** Implemented  
**Date:** 2026-07-02  
**Branch:** `feature/persistence-vc5`  
**Spec:** [PERSISTENCE.md](../PERSISTENCE.md), [VIEW_COMPARE_V1.md](../features/VIEW_COMPARE_V1.md) VC-5

---

## Goal

SQLite-backed sessions and markers; Data and Compare read from API; minimal Intake register form.

---

## Delivered

| Item | Notes |
|------|-------|
| SQLite `data/lapviewer.db` | `sessions` + `markers` tables |
| `GET /api/sessions` | List with lap count, best lap |
| `GET /api/sessions/:id` | Detail + computed laps |
| `POST /api/sessions` | Register by path; duplicate → 409 |
| `GET /api/video/:sessionId` | Stream session file (Range) |
| Seed on empty DB | 3 demo sessions (1 playable demo path) |
| Data page | Fetches API |
| Compare page | Resolves laps from API; streams by session id |
| Intake page | Register form (metadata only) |

---

## Not in this WO

- Marker editing UI on Intake (F3)
- ffprobe / proxy jobs
- `PATCH` / `DELETE` session
- Marker CRUD HTTP routes (DB helpers exist for seed)

---

## Next feature

**Intake lap marking** — player, timeline markers, auto-save, live lap list (F2 + F3).

---

## Verify

```bash
npm run dev
# Data lists seeded sessions from SQLite
# Register new path via Intake
# Compare two laps from session with ready status
```

Delete `data/lapviewer.db` to re-seed on next server start.
