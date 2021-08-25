provider "helm" {
  kubernetes {
    host = azurerm_kubernetes_cluster.lulc.kube_config.host
    client_certificate = azurerm_kubernetes_cluster.lulc.kube_config.client_certificate
    client_key = azurerm_kubernetes_cluster.lulc.kube_config.client_key
    cluster_ca_certificate = azurerm_kubernetes_cluster.lulc.kube_config.cluster_ca_certificate
  }
}
