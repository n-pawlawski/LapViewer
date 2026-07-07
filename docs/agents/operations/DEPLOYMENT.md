# Agent operations — Deployment

Read before changing production infrastructure or debugging deploy failures.

**Human doc:** [DEPLOYMENT.md](../../DEPLOYMENT.md)  
**Runbook:** [RUNBOOK.md](RUNBOOK.md)  
**Terraform:** [infra/README.md](../../../infra/README.md)

---

## Quick signals

1. **`GET /api/ops/status`** — primary diagnostic JSON (`schemaVersion: 1`)
2. **CloudWatch log group** — `/ecs/lapviewer` (from Terraform output)
3. **ECS service events** — task failing health checks → check ALB target group

---

## Deploy flow

```mermaid
flowchart LR
  dev[dev branch] --> check[CI check test build]
  master[master branch] --> deploy[Deploy workflow]
  deploy --> ecr[Push ECR]
  ecr --> ecs[ECS rolling update]
  ecs --> smoke[/api/ops/status]
```

Agents do **not** run `terraform apply` or push to ECR without explicit user approval.

---

## `/api/ops/status` fields

| Field | Healthy | Unhealthy action |
|-------|---------|------------------|
| `ok` | `true` | Read nested failures |
| `gitSha` | matches deploy commit | Rebuild/redeploy |
| `ffmpegAvailable` | `true` | Image missing ffmpeg |
| `db.ok` | `true` | Check RDS security group, `DATABASE_URL` secret |
| `dataDirWritable` | `true` | ECS ephemeral disk / permissions |
| `storageBackend` | `s3` in prod | Set env + bucket |
| `s3Configured` | `true` | Set `S3_BUCKET`, IAM policy |
| `devUserMode` | `false` in prod | Set `DEPLOY_ENV=production` |

---

## Local parity

```bash
docker compose up --build
curl http://localhost:3000/api/ops/status
```

Use `DEPLOY_ENV=local-docker` to match container defaults.

---

## Common deploy failures

See [RUNBOOK.md](RUNBOOK.md) sections for upload, video playback, detection jobs, DB, and disk.
