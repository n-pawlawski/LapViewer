# Where we are & how to continue (LapViewer)

**Last updated:** 2026-07-06  
**Focus:** Data form v2 complete; next Phase 3 auto lap detection

---

## Current phase

**Phase 2 — Data screen refactor** done on `feature/users-v1` (or `feature/data-form-v2`).

| Area | State |
|------|--------|
| **Phase 0** | Intake markers + API — done |
| **Phase 1** | Users & dev account — done ([USERS_V1.md](features/USERS_V1.md), D-018) |
| **Phase 2** | Data v2 — done ([DATA_FORM_V2.md](features/DATA_FORM_V2.md)) |
| **Next** | Phase 3 — Auto lap & split markers: [AUTO_LAP_DETECTION_V1.md](features/AUTO_LAP_DETECTION_V1.md) (MVP), [GOPRO_LAP_SPLIT_DETECTION.md](features/GOPRO_LAP_SPLIT_DETECTION.md) (reference-lap design) |

---

## Run the app locally

```bash
npm run install:all   # if needed
npm run dev
```

- UI: http://localhost:5173 — **Continue as Dev** on first visit  
- Data: search/filter sessions, **All laps** tab, sticky compare dock at bottom

---

## Verification

```bash
npm run check
npm run test:auth --prefix server
```

---

## Traceability

- Roadmap: [ROADMAP.md](ROADMAP.md)
- Data v2 WO: [work-orders/WO-data-form-v2.md](work-orders/WO-data-form-v2.md)
- Users WO: [work-orders/WO-users-v1.md](work-orders/WO-users-v1.md)
