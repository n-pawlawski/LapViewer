# Where we are & how to continue (LapViewer)

**Last updated:** 2026-07-06  
**Focus:** Phase 3 auto lap detection on `feature/auto-lap-detection`

---

## Current phase

**Phase 3 — Auto lap detection (MVP)** in progress on `feature/auto-lap-detection` (based on `feature/data-form-v2` → users v1).

| Area | State |
|------|--------|
| **Phase 0** | Intake markers + API — done |
| **Phase 1** | Users & dev account — done ([USERS_V1.md](features/USERS_V1.md), D-018) |
| **Phase 2** | Data v2 — done ([DATA_FORM_V2.md](features/DATA_FORM_V2.md)) on `feature/data-form-v2` |
| **Phase 3** | Auto lap detection — WO-01..05 done; WO-06 review open ([AUTO_LAP_DETECTION_V1.md](features/AUTO_LAP_DETECTION_V1.md)) |

---

## Run the app locally

```bash
npm run install:all   # if needed
npm run dev
```

- UI: http://localhost:5173 — sign in with **`root` / `root`** in dev mode
- Data: search/filter sessions, **All laps** tab, sticky compare dock at bottom

---

## Verification

```bash
npm run check
npm test
npm run test:auth --prefix server
```

---

## Traceability

- Roadmap: [ROADMAP.md](ROADMAP.md)
- Data v2 WO: [work-orders/WO-data-form-v2.md](work-orders/WO-data-form-v2.md)
- Users WO: [work-orders/WO-users-v1.md](work-orders/WO-users-v1.md)
