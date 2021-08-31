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

  environment          = "dev"
  subscriptionId       = var.subscriptionId
  servicePrincipalJSON = var.servicePrincipalJSON
  region               = "West Europe"
  aks_node_count       = 1

  placeholder_is_gpu = false
  placeholder_num_gpus = 1
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


