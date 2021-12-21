resource "azurerm_postgresql_flexible_server" "lulc" {
  name                   = "${local.prefixnodashes}db"
  resource_group_name    = azurerm_resource_group.lulc.name
  location               = azurerm_resource_group.lulc.location
  version                = "12"
  administrator_login    = "lulc"
  administrator_password = var.postgres_password
  storage_mb             = 32768
  sku_name               = "GP_Standard_D4s_v3"
  private_dns_zone_id    = azurerm_private_dns_zone.lulc.id
  delegated_subnet_id    = azurerm_subnet.postgres.id
  depends_on = [azurerm_private_dns_zone_virtual_network_link.lulc]
  lifecycle {
    ignore_changes = all
  }
}

resource "azurerm_postgresql_flexible_server_database" "lulc" {
  name      = "lulc"
  server_id = azurerm_postgresql_flexible_server.lulc.id
  collation = "en_US.utf8"
  charset   = "utf8"
}