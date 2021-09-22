variable "username" {
  type = string
}


variable "subscriptionId" {
  type = string
}

variable "postgres_password" {
  type = string
}

variable "signing_secret" {
  type = string
}

module "resources" {
  source = "../resources"

  environment          = "production"
  subscriptionId       = var.subscriptionId
  region               = "West Europe"
  aks_node_count       = 1
  
  postgres_password    = var.postgres_password
  signing_secret       = var.signing_secret
  admin_email          = "sanjay@developmentseed.org"
  gpu_count            = 16
  placeholder_is_gpu   = true
  placeholder_num_gpus = 2

  domain = "lulc-production.ds.io"
}

terraform {
  backend "azurerm" {
    resource_group_name  = "lulcterraformdev"
    storage_account_name = "lulcterraformstate"
    container_name       = "lulc-dev"
    key                  = "production.terraform.tfstate"
  }
}

output "resources" {
  value     = module.resources
  sensitive = true
}


