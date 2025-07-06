output "app_name" {
  value = heroku_app.this.name
}

output "app_id" {
  value = heroku_app.this.id
}

output "app_url" {
  value = heroku_app.this.web_url
}

output "redis_url" {
  value       = try(one(heroku_addon.redis_cloud).config["REDIS_URL"], null)
  description = "Redis connection url (null if redis disabled)"
  sensitive   = true
}