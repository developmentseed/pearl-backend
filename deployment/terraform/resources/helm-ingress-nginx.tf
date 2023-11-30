resource "helm_release" "lulc-ingress-nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  depends_on       = [
    azurerm_public_ip.lulc
  ]

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-resource-group"
    value = azurerm_resource_group.lulc.name
  }

  set {
    name = "controller.service.loadBalancerIP"
    value = azurerm_public_ip.lulc.ip_address
  }

  set {
    name = "controller.service.externalTrafficPolicy"
    value = "Local"
  }
}