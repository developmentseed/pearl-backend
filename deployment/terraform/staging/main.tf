variable "username" {
  type = string
}


variable "subscriptionId" {
  type = string
}

variable "servicePrincipalJSON" {
  type = string
}


module "resources" {
  source = "../resources"

  environment          = "staging"
  subscriptionId       = var.subscriptionId
  servicePrincipalJSON = var.servicePrincipalJSON
  region               = "West Europe"
  aks_node_count       = 1

  gpu_count = 2
  placeholder_is_gpu = true
  placeholder_num_gpus = 2

  # FIXME
  # domain = "lulc-staging.ds.io"
}

terraform {
  backend "azurerm" {
    resource_group_name  = "lulcterraformdev"
    storage_account_name = "lulcterraformstate"
    container_name       = "lulc-dev"
    key                  = "dev.terraform.tfstate"
  }
}

output "resources" {
  value     = module.resources
  sensitive = true
}


