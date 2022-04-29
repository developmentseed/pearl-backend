resource "azurerm_kubernetes_cluster" "lulc" {
  lifecycle {
    ignore_changes = [
      # Ignore changes to cluster updates
      all,
    ]
  }
  name                = "${local.prefix}-cluster"
  location            = azurerm_resource_group.lulc.location
  resource_group_name = azurerm_resource_group.lulc.name
  dns_prefix          = "${local.prefix}-cluster"
  kubernetes_version  = "1.20.13"

  default_node_pool {
    name           = "nodepool1"
    vm_size        = "Standard_DS2_v2"
    vnet_subnet_id = azurerm_subnet.aks.id
    enable_auto_scaling   = true
    min_count             = 1
    max_count             = 8
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "AI4E"
  }
}

# add a node pool for the tiler
resource "azurerm_kubernetes_cluster_node_pool" "tiler" {
  name                  = "tiler"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.lulc.id
  vm_size               = "Standard_F8s_v2"
  vnet_subnet_id = azurerm_subnet.aks.id
  enable_auto_scaling   = true
  min_count             = 1
  max_count             = 8

  tags = {
    Environment = var.environment
    ManagedBy   = "AI4E"
  }
}

# add a cpu only nodepool for running ML tasks
resource "azurerm_kubernetes_cluster_node_pool" "cpunodepool" {
  name                  = "cpunodepool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.lulc.id
  vm_size               = "Standard_DS2_v2"
  vnet_subnet_id = azurerm_subnet.aks.id
  enable_auto_scaling   = true
  min_count             = 0
  max_count             = 10
  tags = {
    Environment = var.environment
    ManagedBy   = "AI4E"
  }
}

# add a node pool for the gpu
resource "azurerm_kubernetes_cluster_node_pool" "gpunodepool" {
  name                  = "gpunodepool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.lulc.id
  vm_size               = "Standard_NC12"
  vnet_subnet_id = azurerm_subnet.aks.id
  enable_auto_scaling   = true
  min_count             = 0
  max_count             = 2
  tags = {
    Environment = var.environment
    ManagedBy   = "AI4E"
  }
}

# add the role to the identity the kubernetes cluster was assigned
resource "azurerm_role_assignment" "network" {
  scope                = azurerm_resource_group.lulc.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.lulc.identity[0].principal_id
}
