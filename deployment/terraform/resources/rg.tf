resource "azurerm_resource_group" "lulc" {
  name     = "${local.prefix}_rg"
  location = var.region
}