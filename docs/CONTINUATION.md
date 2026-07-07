# Where we are & how to continue (LapViewer)

**Last updated:** 2026-07-07  
**Focus:** Phase 3 auto lap detection + unified object-storage intake

---

## Current phase

**Phase 3 — Auto lap detection (MVP)** in progress on `feature/auto-lap-detection`.

| Area | State |
|------|--------|
| **Phase 0** | Intake markers + API — done |
| **Phase 1** | Users & dev account — done ([USERS_V1.md](features/USERS_V1.md), D-018) |
| **Phase 2** | Data v2 — done ([DATA_FORM_V2.md](features/DATA_FORM_V2.md)) |
| **Phase 3** | 3A auto lap detection — WO-01..05 done; WO-06 review open. **3C** object-storage media pipeline — done ([WO-unified-upload.md](work-orders/WO-unified-upload.md)) |
| **Phase 4A** | Unified browser intake — done (MinIO + upload-only Intake UI, [D-028](DECISIONS.md)) |
| **Phase 3B** | Spike **GO**; next M2-LV persistence |

---

## Run the app locally

```bash
docker compose up minio minio-init -d   # object storage sidecar
cp config/.env.example .env             # STORAGE_BACKEND=s3
npm run install:all   # if needed
npm run dev
```

- UI: http://localhost:5173 — sign in with **`root` / `root`** in dev mode
- Full Docker parity: `docker compose up --build` → http://deltaview.docker:3090

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
- Upload WO: [work-orders/WO-unified-upload.md](work-orders/WO-unified-upload.md)
- Auto-lap WO: [work-orders/WO-auto-lap-detection.md](work-orders/WO-auto-lap-detection.md)
