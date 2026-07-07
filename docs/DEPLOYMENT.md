# Deployment

LapViewer deployment path from local Windows dev to public SaaS on AWS.

**Related:** [infra/README.md](../infra/README.md), [agents/operations/DEPLOYMENT.md](agents/operations/DEPLOYMENT.md), [agents/operations/RUNBOOK.md](agents/operations/RUNBOOK.md), [DECISIONS.md](DECISIONS.md) D-025–D-027

---

## Branch model

| Branch | Role |
|--------|------|
| `dev` | Integration — merge verified feature work here |
| `master` | Deployable snapshots — promote when check + test + smoke pass |

Promotion: merge `dev` → `master` when ready to deploy ([D-025](DECISIONS.md)).

---

## Local Docker (Phase 1 parity)

Reproduces production code paths without AWS spend:

```bash
# Add 127.0.0.1 lapviewer.docker to hosts (see config/docker-hosts.snippet)
npm run docker:hosts   # Windows, elevated
docker compose up --build
```

Open [http://deltaview.docker:3090](http://deltaview.docker:3090) (Docker uses port **3090** so `npm run dev` can keep **3000**). Health: [http://lapviewer.docker:3090/api/ops/status](http://lapviewer.docker:3090/api/ops/status)

Environment defaults in `docker-compose.yml` use `DEPLOY_ENV=local-docker`, SQLite in `/data`, and dev user seed enabled.

---

## Environment variables

Copy [`config/.env.example`](../config/.env.example) to `.env` at repo root.

| Variable | Local | Production |
|----------|-------|------------|
| `DEPLOY_ENV` | `development` | `production` |
| `STORAGE_BACKEND` | `local_path` | `s3` |
| `DATABASE_URL` | omit (SQLite) | RDS Postgres URL |
| `S3_BUCKET` | — | from Terraform output |
| `SESSION_SECRET` | dev default | Secrets Manager |
| `CLIENT_ORIGIN` | `http://localhost:5173` | public app URL |
| `GIT_SHA` | `local` | CI injects commit SHA |

---

## Storage modes

- **Local dev:** Windows path picker + `VIDEO_LIBRARY_ROOT` ([D-002](DECISIONS.md))
- **Production:** S3 presigned upload ([D-026](DECISIONS.md)); originals at `users/{userId}/sessions/{sessionId}/{fileName}`

---

## AWS deploy (Phase 4–5)

**DeltaView production:** [DELTAVIEW_AWS_SETUP.md](DELTAVIEW_AWS_SETUP.md) — `deltaview.app`, us-east-1, HTTPS.

1. Register **deltaview.app** in Route 53
2. `cd infra/terraform && terraform apply`
3. Configure GitHub secrets/variables per [infra/README.md](../infra/README.md)
4. Run **Deploy** workflow on `master`

---

## GitHub remote

When ready to enable CI on GitHub:

```bash
git remote add origin https://github.com/<org>/LapViewer.git
git push -u origin dev
git push -u origin master
```

CI runs on push to `dev` or `master` ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). Deploy runs on `master` only.

---

## Health endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Legacy health + demo video flags |
| `GET /api/ops/status` | Agent ops contract (schema v1): git SHA, DB, ffmpeg, storage |

See [agents/operations/RUNBOOK.md](agents/operations/RUNBOOK.md) for troubleshooting.

---

## Pre-launch checklist

- [ ] `DEPLOY_ENV=production` — no dev seed
- [ ] Strong `SESSION_SECRET` in Secrets Manager
- [ ] `DATABASE_URL` → Postgres ([D-027](DECISIONS.md))
- [ ] `STORAGE_BACKEND=s3` + bucket IAM on ECS task role
- [ ] HTTPS on ALB (ACM certificate + listener)
- [ ] `CLIENT_ORIGIN` matches public URL
- [ ] Post-deploy smoke: `/api/ops/status` returns `"ok": true`
