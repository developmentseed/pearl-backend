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

  environment          = var.username
  subscriptionId       = var.subscriptionId
  servicePrincipalJSON = var.servicePrincipalJSON
  region               = "West Europe"
  aks_node_count       = 1
}

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

output "resources" {
  value     = module.resources
  sensitive = true
}


