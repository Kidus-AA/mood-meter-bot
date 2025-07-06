resource "heroku_app" "this" {
  name   = var.app_name
  region = var.region
  stack  = var.stack

  lifecycle {
    ignore_changes = [buildpacks]
  }
}

resource "heroku_formation" "dynos" {
  for_each = var.dynos

  app_id   = heroku_app.this.id
  type     = each.key      # e.g., "web", "worker"
  quantity = each.value.quantity
  size     = each.value.size
}

resource "heroku_addon" "redis" {
  count  = var.enable_redis ? 1 : 0
  app_id = heroku_app.this.id
  plan   = var.redis_plan
}

locals {
  redis_env = var.enable_redis ? {
    REDIS_URL      = one(heroku_addon.redis).config_var_values["REDIS_URL"]
  } : {}

  merged_vars = merge(local.redis_env, var.env_vars)
}

resource "heroku_app_config_association" "env" {
  app_id = heroku_app.this.id

  vars            = local.merged_vars
  sensitive_vars  = var.sensitive_env_vars
}