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

variable "redis_plan" {
  description = "Heroku Redis plan"
  type        = string
  default     = "rediscloud:30"
}

variable "cloudamqp_plan" {
  description = "Heroku CloudAMQP plan"
  type        = string
  default     = "cloudamqp:lemur"
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