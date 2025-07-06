terraform {
  required_version = ">= v1.12.1"

  required_providers {
    heroku = {
      source  = "heroku/heroku"
      version = "~> 5.1"
    }
  }
}

provider "heroku" {}