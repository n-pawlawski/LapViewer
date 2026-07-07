variable "project_name" {
  type    = string
  default = "deltaview"
}

variable "domain_name" {
  type        = string
  default     = "deltaview.app"
  description = "Public site domain (Route 53 hosted zone must exist before apply)"
}

variable "enable_custom_domain" {
  type        = bool
  default     = true
  description = "ACM cert, HTTPS listener, and Route 53 alias for domain_name"
}

variable "create_www_alias" {
  type    = bool
  default = true
}

variable "environment" {
  type    = string
  default = "production"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

variable "enable_nat_gateway" {
  type    = bool
  default = true
}

variable "app_port" {
  type    = number
  default = 3000
}

variable "task_cpu" {
  type    = string
  default = "1024"
}

variable "task_memory" {
  type    = string
  default = "2048"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "create_rds" {
  type    = bool
  default = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "postgres_engine_version" {
  type    = string
  default = "16.4"
}

variable "allow_destroy" {
  type    = bool
  default = false
}
