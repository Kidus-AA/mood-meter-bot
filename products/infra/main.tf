module "mood_meter" {
  source = "./modules/heroku_app"

  app_name = var.app_name   # reuse existing variable
  region   = var.heroku_region
  stack    = var.stack

  dynos = {
    web = {
      quantity = 1
      size     = var.backend_dyno_size
    }
    worker = {
      quantity = 1
      size     = var.poller_dyno_size
    }
  }

  enable_redis = true
  redis_plan   = var.backend_redis_plan

  env_vars = merge(var.env_vars, {
    APP_ENV = "production"
  })
  sensitive_env_vars = var.sensitive_env_vars
}

resource "heroku_app_config_association" "env" {
  app_id = module.mood_meter.app_id

  sensitive_vars  = var.sensitive_env_vars
}

output "app_name" {
  value = module.mood_meter.app_name
}