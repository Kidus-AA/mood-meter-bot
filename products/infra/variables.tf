variable "app_name" {
  description = "Heroku app name"
  type        = string
}

variable "heroku_region" {
  description = "Heroku region (us or eu)"
  type        = string
  default     = "us"
}

variable "stack" {
  description = "Heroku stack (container, heroku-22, etc.)"
  type        = string
  default     = "container"
}

variable "backend_dyno_size" {
  description = "Dyno size for backend web process"
  type        = string
  default     = "basic"
}

variable "poller_dyno_size" {
  description = "Dyno size for poller worker process"
  type        = string
  default     = "basic"
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
  description = "Map of environment variables to apply to heroku app"
  type        = map(string)
  default     = {}
}

variable "sensitive_env_vars" {
  description = "Map of sensitive environment variables to apply to heroku app"
  type        = map(string)
  sensitive   = true
  default     = {}
}