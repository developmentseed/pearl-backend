provider azurerm {
  features {}
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.84.0"
    }
    helm = {
      source = "hashicorp/helm"
      version = "=2.5.1"
    }
  }
}
