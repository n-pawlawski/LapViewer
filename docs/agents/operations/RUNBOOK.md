# Agent operations — Runbook

Troubleshooting guide for LapViewer production and Docker parity.

**Health contract:** `GET /api/ops/status` — `schemaVersion: 1` (see [DEPLOYMENT.md](DEPLOYMENT.md))

---

## Health schema v1

Stable fields agents should parse:

```json
{
  "schemaVersion": 1,
  "ok": true,
  "gitSha": "abc123",
  "deployEnv": "production",
  "uptimeSeconds": 3600,
  "ffmpegAvailable": true,
  "dataDirWritable": true,
  "db": { "ok": true, "kind": "postgres" },
  "storageBackend": "s3",
  "s3Configured": true,
  "devUserMode": false
}
```

When `ok` is false, inspect the failing sub-check before restarting tasks.

---

## Upload failures

**Symptoms:** Intake stuck on upload; `uploadStatus` pending; 400 on complete-upload.

| Check | Command / location |
|-------|-------------------|
| S3 enabled | `/api/ops/status` → `storageBackend: s3`, `s3Configured: true` |
| Object exists | S3 console → `users/{userId}/sessions/{id}/` |
| Presigned PUT | Client network tab — 403 → clock skew or wrong Content-Type |
| Complete called too early | Wait for PUT 200 before `POST .../complete-upload` |

**Logs:** CloudWatch filter `"msg":"request"` and path `/complete-upload`.

---

## Video won't play

| Cause | Fix |
|-------|-----|
| `uploadStatus !== complete` | Complete upload first |
| S3 403 on stream | ECS task role needs `s3:GetObject` |
| Range requests fail | ALB idle timeout; check 206 responses |
| Local path in prod | Session still `local_path` — re-register via S3 upload |

---

## Detection job stuck

| Check | Action |
|-------|--------|
| `ffmpegAvailable: false` | Rebuild Docker image with ffmpeg |
| Task OOM | Increase ECS memory to ≥ 2048 MB |
| Long job blocking | Jobs are async; check `/api/detect-laps/*` job status endpoints |

---

## Database connection errors

| Symptom | Action |
|---------|--------|
| `db.ok: false`, kind postgres | Verify RDS in same VPC; security group allows ECS → 5432 |
| Secret rotation | Update ECS task definition secret reference |
| SQLite in prod | Set `DATABASE_URL` — do not use SQLite on EFS for multi-writer |

---

## Out of disk / cache

ECS tasks use ephemeral storage for ffmpeg scratch (`DATA_DIR=/tmp/lapviewer`). If transcode fails:

- Increase Fargate ephemeral storage in task definition
- Ensure proxy cache keys go to S3, not local disk only

---

## CloudWatch Insights cheatsheet

Log group: `/ecs/lapviewer` (default from Terraform)

**5xx errors:**

```
fields @timestamp, msg, path, statusCode, err.message
| filter msg = "request" and statusCode >= 500
| sort @timestamp desc
| limit 50
```

**S3 failures:**

```
fields @timestamp, msg, objectKey, err
| filter msg like /s3_/
| sort @timestamp desc
```

**Slow requests (>5s):**

```
fields @timestamp, path, durationMs, userId
| filter msg = "request" and durationMs > 5000
| sort durationMs desc
```

**Startup:**

```
fields @timestamp, msg, gitSha, deployEnv, ffmpegAvailable
| filter msg = "server_started"
```

---

## Post-deploy smoke test

Manual or CI ([`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml)):

```bash
curl -sf "$APP_URL/api/ops/status" | jq '.ok, .gitSha, .db.ok'
curl -sf "$APP_URL/api/health" | jq '.ffmpegAvailable'
```

Expected: `ok: true`, matching `gitSha`, `db.ok: true`, `devUserMode: false` in production.

---

## Rollback

1. GitHub Actions → Deploy workflow → **Run workflow** with previous image tag, or
2. `aws ecs update-service --force-new-deployment` after pushing `:previous-sha` to ECR

Always verify `/api/ops/status` after rollback.
