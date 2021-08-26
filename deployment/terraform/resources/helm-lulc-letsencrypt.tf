resource "helm_release" "lulc-letsencrypt" {
  name             = "lulc-letsencrypt"
  chart            = "../../helm/lulc-letsencrypt"
  namespace        = "cert-manager"
  depends_on       = [
      helm_release.lulc-cert-manager
  ]
  set {
    name  = "email"
    value = var.letsencrypt_email
  } 
}