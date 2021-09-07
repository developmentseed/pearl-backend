variable "username" {
  type = string
}

variable "subscriptionId" {
  type = string
}

variable "servicePrincipalJSON" {
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

  environment          = "dev"
  subscriptionId       = var.subscriptionId
  servicePrincipalJSON = var.servicePrincipalJSON
  region               = "West Europe"
  aks_node_count       = 1
  admin_email          = "sanjay@developmentseed.org"
  postgres_password    = var.postgres_password
  signing_secret       = var.signing_secret
  placeholder_is_gpu   = false
  placeholder_num_gpus = 2
  domain               = "lulc-test.ds.io"
}

terraform {
  backend "azurerm" {
    resource_group_name  = "lulcterraformdev"
    storage_account_name = "lulcterraformstate"
    container_name       = "lulc-dev"
    key                  = "dev.terraform.tfstate"
  }
}

# terraform {
#   backend "local" {
#     path = "terraform.tfstate"
#   }
# }

output "resources" {
  value     = module.resources
  sensitive = true
}

