# LapViewer AWS infrastructure (Terraform)

Starter stack for public SaaS v1: ECS Fargate, ALB, RDS Postgres, S3, ECR, Secrets Manager, CloudWatch.

## Prerequisites

- AWS CLI configured
- Terraform >= 1.5
- Domain optional (ALB serves HTTP on port 80 initially; add ACM + HTTPS listener later)

## Apply

```bash
cd infra/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Outputs (for CI/CD and agents)

After apply, note:

| Output | Use |
|--------|-----|
| `ecr_repository_url` | Docker push target |
| `ecs_cluster_name` | GitHub `ECS_CLUSTER` variable |
| `ecs_service_name` | GitHub `ECS_SERVICE` variable |
| `alb_dns_name` | Smoke test URL (`http://<dns>/api/ops/status`) |
| `s3_bucket_name` | Already injected into task env |
| `cloudwatch_log_group` | Log Insights queries |

## GitHub Actions secrets/variables

Set in repo settings after first `terraform apply`:

| Name | Source |
|------|--------|
| `AWS_ACCESS_KEY_ID` | IAM user or OIDC |
| `AWS_SECRET_ACCESS_KEY` | IAM user (skip with OIDC) |
| `AWS_REGION` | e.g. `us-east-1` |
| `ECR_REPOSITORY` | `lapviewer` (default) |
| `ECS_CLUSTER` | terraform output `ecs_cluster_name` |
| `ECS_SERVICE` | terraform output `ecs_service_name` |
| `APP_URL` | `http://<alb_dns_name>` for post-deploy smoke |

## Cost notes

Default: 1× Fargate task (1 vCPU / 2 GB), db.t4g.micro, NAT gateway (~$32/mo). Disable NAT for dev-only experiments (`enable_nat_gateway = false`) if tasks run in public subnets.

## Destroy

```bash
terraform destroy
```

Set `allow_destroy = true` if ECR repository has images blocking delete.
