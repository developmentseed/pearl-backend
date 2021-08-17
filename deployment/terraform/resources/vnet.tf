resource "azurerm_virtual_network" "lulc-cluster" {
  name                = "${local.prefix}-cluster-network"
  location            = azurerm_resource_group.lulc.location
  resource_group_name = azurerm_resource_group.lulc.name
  address_space       = ["10.0.0.0/8"]
}
resource "azurerm_virtual_network" "lulc-gateway" {
  name                = "${local.prefix}-gateway-network"
  location            = azurerm_resource_group.lulc.location
  resource_group_name = azurerm_resource_group.lulc.name
  address_space       = ["11.0.0.0/8"]
}

resource "azurerm_subnet" "gateway" {
  name                 = "${local.prefix}-gateway-subnet"
  virtual_network_name = azurerm_virtual_network.lulc-gateway.name
  resource_group_name  = azurerm_resource_group.lulc.name
  address_prefixes     = ["11.0.0.0/8"]
}

# subnet for node pools
resource "azurerm_subnet" "aks" {
  name                 = "${local.prefix}-aks-subnet"
  virtual_network_name = azurerm_virtual_network.lulc-cluster.name
  resource_group_name  = azurerm_resource_group.lulc.name
  address_prefixes     = ["10.0.0.0/16"]
}

# subnet for postgres that's delegated
resource "azurerm_subnet" "postgres" {
  name                 = "${local.prefix}-postgres-subnet"
  virtual_network_name = azurerm_virtual_network.lulc-cluster.name
  resource_group_name  = azurerm_resource_group.lulc.name
  address_prefixes     = ["10.0.0.0/24"]
  service_endpoints = [
    "Microsoft.Storage"
  ]
  delegation {
    name = "delegation"

    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_private_dns_zone" "lulc" {
  name                = "${local.prefix}-db.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.lulc.name
}

resource "azurerm_private_dns_zone" "lulc" {
  name                = "${local.prefix}-db.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.lulc.name
}

