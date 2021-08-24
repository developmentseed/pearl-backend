variable "username" {
  type = string
}

module "resources" {
  source = "../resources"

  environment = var.username
  region      = "West Europe"
  aks_node_count    = 1
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


