output "environment" {
    value = var.environment
}

output "location" {
    value = local.location
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.lulc.name
}

output "resource_group" {
  value = azurerm_resource_group.lulc.name
}

output "image_registry" {
  value = data.azurerm_container_registry.lulc.name
}

output "storage_connection_string" {
  value = azurerm_storage_account.lulc.primary_connection_string
}

output "postgresql_connection_string" {
  value = "postgres://lulc:${azurerm_postgresql_flexible_server.administrator_password}@${azurerm_postgresql_flexible_server.name}.postgres.database.azure.com/lulc?sslmode=require"
}