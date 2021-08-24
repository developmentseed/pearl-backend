resource "azurerm_virtual_network_peering" "lulc1to2" {
  name                      = "${local.prefix}peering1to2"
  resource_group_name       = azurerm_resource_group.lulc.name
  virtual_network_name      = azurerm_virtual_network.lulc-cluster.name
  remote_virtual_network_id = azurerm_virtual_network.lulc-gateway.id
}

resource "azurerm_virtual_network_peering" "lulc2to1" {
  name                      = "${local.prefix}peering2to1"
  resource_group_name       = azurerm_resource_group.lulc.name
  virtual_network_name      = azurerm_virtual_network.lulc-gateway.name
  remote_virtual_network_id = azurerm_virtual_network.lulc-cluster.id
}
