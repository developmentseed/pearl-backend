resource "azurerm_public_ip" "lulc" {
  name                = "${local.prefix}PublicIP"
  resource_group_name = azurerm_resource_group.lulc.name
  location            = azurerm_resource_group.lulc.location
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = var.environment
  }
}