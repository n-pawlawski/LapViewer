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

## Local Docker (production parity)

Reproduces production code paths without AWS spend. Includes **MinIO** (S3-compatible) for browser upload.

```bash
# Add 127.0.0.1 deltaview.docker to hosts (see config/docker-hosts.snippet)
npm run docker:hosts   # Windows, elevated
docker compose up --build
```

Open [http://deltaview.docker:3090](http://deltaview.docker:3090) (Docker uses port **3090** so `npm run dev` can keep **3000**). Health: [http://deltaview.docker:3090/api/ops/status](http://deltaview.docker:3090/api/ops/status)

MinIO console: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`).

Environment defaults in `docker-compose.yml`: `STORAGE_BACKEND=s3`, SQLite in `/data`, MinIO bucket `lapviewer-videos`, dev user seed enabled.

### Native dev with MinIO

```bash
docker compose up minio minio-init -d
cp config/.env.example .env   # STORAGE_BACKEND=s3, AWS_ENDPOINT_URL=http://127.0.0.1:9000
npm run dev
```

---

## Environment variables

Copy [`config/.env.example`](../config/.env.example) to `.env` at repo root.

| Variable | Local / Docker | Production |
|----------|----------------|------------|
| `DEPLOY_ENV` | `development` / `local-docker` | `production` |
| `STORAGE_BACKEND` | `s3` (MinIO) | `s3` (AWS) |
| `AWS_ENDPOINT_URL` | `http://127.0.0.1:9000` or `http://minio:9000` | omit |
| `S3_PUBLIC_ENDPOINT` | `http://127.0.0.1:9000` (browser PUT) | omit |
| `S3_FORCE_PATH_STYLE` | `true` (MinIO) | `false` |
| `DATABASE_URL` | omit (SQLite) | RDS Postgres URL |
| `S3_BUCKET` | `lapviewer-videos` | from Terraform output |
| `SESSION_SECRET` | dev default | Secrets Manager |
| `CLIENT_ORIGIN` | `http://localhost:5173` | public app URL |
| `GIT_SHA` | `local` | CI injects commit SHA |

---

## Storage modes

- **All environments (new sessions):** S3 presigned upload ([D-028](DECISIONS.md), [D-026](DECISIONS.md)); MinIO locally, AWS in production
- **Legacy:** `local_path` sessions remain playable; path registration disabled when `STORAGE_BACKEND=s3`

---

## AWS deploy (Phase 4–5)

**DeltaView production:** [DELTAVIEW_AWS_SETUP.md](DELTAVIEW_AWS_SETUP.md) — `deltaview.info`, us-east-1, HTTPS.

1. Register **deltaview.info** in Route 53
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
