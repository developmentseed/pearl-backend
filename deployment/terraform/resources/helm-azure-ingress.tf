resource "helm_release" "lulc-azure-ingress" {
  name             = "azure-ingress"
  repository       = "https://appgwingress.blob.core.windows.net/ingress-azure-helm-package"
  chart            = "ingress-azure"

  set {
    name  = "appgw.subscriptionId"
    value = var.subscriptionId
  }

  set {
    name  = "appgw.resourceGroup"
    value = azurerm_resource_group.lulc.name
  }

  set {
    name  = "appgw.name"
    value = azurerm_application_gateway.network.name
  }

  set {
    name  = "appgw.usePrivateIP"
    value = false
  }

  set {
    name  = "rbac.enabled"
    value = true
  }

  set {
    name  = "armAuth.type"
    value = "servicePrincipal"
  }

  set {
    name = "armAuth.secretJSON"
    value = var.servicePrincipalJSON
  }
}