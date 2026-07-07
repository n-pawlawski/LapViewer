# DeltaView AWS infrastructure (Terraform)

Starter stack for **https://deltaview.info** in **us-east-1**: ECS Fargate, ALB + HTTPS (ACM), Route 53, RDS Postgres, S3, ECR, Secrets Manager, CloudWatch.

**Full walkthrough:** [DELTAVIEW_AWS_SETUP.md](../docs/DELTAVIEW_AWS_SETUP.md)

## Prerequisites

- AWS CLI configured (`us-east-1`)
- Terraform >= 1.5
- **deltaview.info registered in Route 53** (hosted zone must exist before `enable_custom_domain = true`)

## Apply

```bash
cd infra/terraform
copy terraform.tfvars.example terraform.tfvars   # Windows
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Outputs

| Output | Use |
|--------|-----|
| `app_url` | **https://deltaview.info** |
| `ecr_repository_url` | Docker push target |
| `ecs_cluster_name` | GitHub `ECS_CLUSTER` (`deltaview`) |
| `ecs_service_name` | GitHub `ECS_SERVICE` (`deltaview-api`) |
| `alb_dns_name` | Raw ALB hostname (fallback) |
| `s3_bucket_name` | Video originals bucket |
| `cloudwatch_log_group` | `/ecs/deltaview` |

## GitHub Actions

| Name | Value |
|------|--------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM deploy user |
| `AWS_REGION` | `us-east-1` |
| `ECS_CLUSTER` | `deltaview` |
| `ECS_SERVICE` | `deltaview-api` |
| `ECR_REPOSITORY` | `deltaview` |
| `APP_URL` | `https://deltaview.info` |

## Cost notes

Default: 1× Fargate (1 vCPU / 2 GB), db.t4g.micro, NAT gateway (~$32/mo) + domain ~$14/yr.

Set `enable_custom_domain = false` in `terraform.tfvars` for HTTP-only ALB testing before domain registration.

## Destroy

```bash
terraform destroy
```

Set `allow_destroy = true` if ECR has images blocking delete.
