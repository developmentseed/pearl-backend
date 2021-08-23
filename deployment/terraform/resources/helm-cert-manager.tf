resource "helm_release" "lulc" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = "v1.1.0"
  namespace        = "cert-manager"
  create_namespace = true
}