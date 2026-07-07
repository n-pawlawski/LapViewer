output "app_url" {
  value       = local.app_url
  description = "Public app URL (https://deltaview.app when custom domain is enabled)"
}

output "domain_name" {
  value = var.enable_custom_domain ? var.domain_name : null
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.videos.bucket
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.app.name
}

output "database_secret_arn" {
  value       = var.create_rds ? aws_secretsmanager_secret.db[0].arn : null
  description = "Secrets Manager ARN for DATABASE_URL"
}

output "session_secret_arn" {
  value = aws_secretsmanager_secret.session.arn
}
