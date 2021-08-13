resource "azurerm_storage_account" "lulc" {
  name                     = "${local.storage}"
  resource_group_name      = azurerm_resource_group.lulc.name
  location                 = azurerm_resource_group.lulc.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "aois" {
  name                  = "aois"
  storage_account_name  = azurerm_storage_account.lulc.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "checkpoints" {
  name                  = "checkpoints"
  storage_account_name  = azurerm_storage_account.lulc.name
  container_access_type = "private" 
}

resource "azurerm_storage_container" "models" {
  name                  = "models"
  storage_account_name  = azurerm_storage_account.lulc.name
  container_access_type = "private"
}

# container for frontend static files
resource "azurerm_storage_account" "lulcfrontend" {
  name                     = "${local.storage}frontend"
  resource_group_name      = azurerm_resource_group.lulc.name
  location                 = azurerm_resource_group.lulc.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  static_website {
    index_document = "index.html"
    error_404_document = "404.html"
  }
}