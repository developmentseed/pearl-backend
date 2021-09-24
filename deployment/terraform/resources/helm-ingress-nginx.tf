resource "helm_release" "lulc-ingress-nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  # depends_on       = [
  #   azurerm_public_ip.lulc
  # ]

  # set {
  #   name = "controller.service.loadBalancerIP"
  #   value = azurerm_public_ip.lulc.ip_address
  # }

}