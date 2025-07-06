terraform {
  required_version = ">= v1.12.1"

  backend "s3" {}

  required_providers {
    heroku = {
      source  = "heroku/heroku"
      version = "~> 5.1"
    }
  }
}

provider "heroku" {}