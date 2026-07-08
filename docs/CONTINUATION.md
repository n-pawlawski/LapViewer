# Where we are & how to continue (LapViewer)

**Last updated:** 2026-07-07  
**Focus:** Phase 3A auto lap detection review + Phase 3B reference-lap persistence; Phase 5 deploy

---

## Current phase

**Phase 3 — Auto lap detection (MVP)** in progress; **Phase 5 deploy** active in parallel.

| Area | State |
|------|--------|
| **Phase 0** | Intake markers + API — done |
| **Phase 1** | Users & dev account — done ([USERS_V1.md](features/USERS_V1.md), D-018, D-029) |
| **Phase 2** | Data v2 — done ([DATA_FORM_V2.md](features/DATA_FORM_V2.md)) |
| **Phase 3A** | Auto lap detection — WO-01..05 done; WO-06 review open |
| **Phase 3C** | Object-storage media pipeline — done ([WO-unified-upload.md](work-orders/WO-unified-upload.md)) |
| **Phase 3B** | Reference-lap progress — spike **GO**; M2-LV persistence next |
| **Phase 4A** | Unified browser intake — done (MinIO + upload-only Intake, [D-028](DECISIONS.md)) |
| **Phase 4B** | Public sessions — done ([PUBLIC_SESSIONS_V1.md](features/PUBLIC_SESSIONS_V1.md), [D-030](DECISIONS.md)) |
| **Phase 5** | AWS deploy — in progress ([WO-deploy-v1.md](work-orders/WO-deploy-v1.md)) |

---

## Run the app locally

```bash
docker compose up minio minio-init -d   # object storage sidecar
cp config/.env.example .env             # STORAGE_BACKEND=s3
npm run install:all   # if needed
npm run dev
```

- UI: http://localhost:5173 — sign in with **`root` / `root`** in dev mode, or **Continue with Google** when configured
- Full Docker parity: `docker compose up --build` → http://deltaview.docker:3090

---

## Verification

```bash
npm run check
npm test
npm run test:auth --prefix server
npm run test:public --prefix server
```

---

## Traceability

- Roadmap: [ROADMAP.md](ROADMAP.md)
- Upload WO: [work-orders/WO-unified-upload.md](work-orders/WO-unified-upload.md)
- Public sessions WO: [work-orders/WO-public-sessions.md](work-orders/WO-public-sessions.md)
- Auto-lap WO: [work-orders/WO-auto-lap-detection.md](work-orders/WO-auto-lap-detection.md)
- Deploy WO: [work-orders/WO-deploy-v1.md](work-orders/WO-deploy-v1.md)
