data "azurerm_container_registry" "lulc" {
  name                = var.lulc_test_resources_acr
  resource_group_name = var.lulc_test_resources_rg
}

# add the role to the identity the kubernetes cluster was assigned
resource "azurerm_role_assignment" "attach_acr" {
  scope                = data.azurerm_container_registry.lulc.id
  role_definition_name = "Owner"
  principal_id         = azurerm_kubernetes_cluster.lulc.kubelet_identity[0].object_id
}
