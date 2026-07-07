# WO-deploy-v1 — AWS deployment phases

**Status:** Ready  
**Work type:** architecture, api, persistence, client, maintenance  
**Related:** [DEPLOYMENT.md](../DEPLOYMENT.md), [ROADMAP.md](../ROADMAP.md) Phase 5

---

## Goal

Path from local Windows app to public SaaS on AWS with agent-diagnosable operations.

---

## Phase checklist

### Phase 0 — Branch and repo hygiene

- [x] `master` branch from `dev`
- [x] D-025 branch policy in [DECISIONS.md](../DECISIONS.md)
- [x] [PROCESS_HYGIENE.md](../PROCESS_HYGIENE.md) + git workflow rule updated
- [x] [DEPLOYMENT.md](../DEPLOYMENT.md) skeleton
- [ ] GitHub remote + push (user provides URL)

### Phase 1 — Docker + observability

- [x] `Dockerfile`, `docker-compose.yml`, `.dockerignore`
- [x] `/api/ops/status` schema v1
- [x] Structured JSON logging
- [x] `config/.env.example` production block
- [x] CI: `npm test` + `npm run build`

### Phase 2 — S3 upload

- [x] Session columns: `storageKind`, `objectKey`, `uploadStatus`
- [x] `POST /api/sessions/upload-url`, `POST /api/sessions/:id/complete-upload`
- [x] S3 Range streaming for video
- [x] Intake upload UI when `storageBackend=s3`

### Phase 3 — Postgres + production auth

- [x] Postgres schema in `infra/postgres/schema.sql`
- [x] `DATABASE_URL` → Postgres via sync wrapper
- [x] Secure cookies when `DEPLOY_ENV=production`
- [x] Dev seed disabled in production

### Phase 4–5 — AWS + CI/CD

- [x] Terraform in `infra/terraform/`
- [x] GitHub Actions deploy on `master`
- [ ] First `terraform apply` + ECR push (requires AWS account)

### Phase 6 — Agent ops kit

- [x] [RUNBOOK.md](../agents/operations/RUNBOOK.md)
- [x] Health schema documented
- [x] CloudWatch query cheatsheet
- [x] Post-deploy smoke in deploy workflow

---

## Verification

```bash
npm run check
npm test
npm run build
docker compose up --build
curl http://localhost:3000/api/ops/status
```

---

## Open before Phase 4 apply

- AWS region preference
- Domain name (optional)
- Auth: self-hosted email/password vs Cognito
- Monthly budget ceiling
