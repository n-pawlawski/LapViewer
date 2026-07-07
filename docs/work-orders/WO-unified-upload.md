# WO-unified-upload — Browser upload + object storage everywhere

**Status:** Ready  
**Work type:** architecture, api, persistence, client, maintenance  
**Related:** [ROADMAP.md](../ROADMAP.md) Phase 3C + 4A, [D-028](../DECISIONS.md), [DEPLOYMENT.md](../DEPLOYMENT.md)

---

## Goal

One intake path across native dev, Docker, and AWS: browser upload → presigned PUT → object storage, with ffmpeg processing on uploaded sessions.

---

## Phase checklist

### WO-U1 — Object-storage media pipeline (Phase 3C)

- [x] `resolveSessionMediaInput()` / `resolveSessionMediaPath()` in `server/src/services/sessionMedia.ts`
- [x] `downloadS3ObjectToFile()` in `server/src/services/objectStorage.ts`
- [x] Detection, split, track-match, reference-build, and split-bank routes use media resolver
- [x] Lazy materialize S3 originals to `DATA_DIR/cache/{sessionId}/original.mp4`

### WO-U2 — MinIO + S3 client config (Phase 4A)

- [x] `AWS_ENDPOINT_URL`, `S3_PUBLIC_ENDPOINT`, `S3_FORCE_PATH_STYLE` in `server/src/config.ts`
- [x] Dual S3 client for server ops vs browser-reachable presigned URLs
- [x] MinIO + `minio-init` services in `docker-compose.yml`
- [x] Docker `STORAGE_BACKEND=s3`, bucket `lapviewer-videos`
- [x] `config/.env.example` MinIO defaults for native dev

### WO-U3 — Unified Intake UI (Phase 4A)

- [x] `IntakePage.tsx` — browser upload only; path picker removed
- [x] `POST /api/sessions` returns 410 when `STORAGE_BACKEND=s3`
- [x] Clear error when upload not configured

### WO-U4 — Documentation sweep

- [x] [ROADMAP.md](../ROADMAP.md), [DECISIONS.md](../DECISIONS.md) D-028
- [x] [INTAKE_FLOW.md](../INTAKE_FLOW.md), [VIDEO_LIBRARY.md](../VIDEO_LIBRARY.md)
- [x] [PERSISTENCE.md](../PERSISTENCE.md), [ARCHITECTURE.md](../ARCHITECTURE.md)
- [x] [DEPLOYMENT.md](../DEPLOYMENT.md), [FEATURES.md](../FEATURES.md) F1.1
- [x] [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md), [CONTINUATION.md](../CONTINUATION.md)
- [x] [agents/operations/RUNBOOK.md](../agents/operations/RUNBOOK.md) upload troubleshooting

### WO-U5 — Smoke verification

- [ ] `docker compose up --build` — upload → playback → auto-detect on MinIO session
- [ ] `npm run check && npm test`
- [ ] ECS smoke when production is live

---

## Verification

```bash
# Start MinIO only (native dev)
docker compose up minio minio-init -d

# Full stack
docker compose up --build

# Intake: upload GX010012.MP4 → mark laps → auto-detect
npm run check
npm test
curl http://deltaview.docker:3090/api/ops/status
```

---

## Legacy sessions

Existing `storageKind=local_path` rows continue to work. No forced migration. Optional later: re-upload tool for path-based sessions.
