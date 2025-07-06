variable "app_name" {
  description = "Heroku app name"
  type        = string
}

variable "region" {
  description = "Heroku region (us or eu)"
  type        = string
  default     = "us"
}

variable "stack" {
  description = "Heroku stack (container, heroku-22, etc.)"
  type        = string
  default     = "container"
}

variable "dynos" {
  description = "Map of dyno process types and their formation settings"
  type = map(object({
    quantity = number
    size     = string
  }))
}

variable "enable_redis" {
  description = "Whether to provision a Heroku Redis addon"
  type        = bool
  default     = true
}

variable "redis_plan" {
  description = "Heroku Redis plan"
  type        = string
  default     = "heroku-redis:hobby-dev"
}

variable "env_vars" {
  description = "Non-sensitive environment variables"
  type        = map(string)
  default     = {}
}

variable "sensitive_env_vars" {
  description = "Sensitive environment variables"
  type        = map(string)
  sensitive   = true
  default     = {}
}