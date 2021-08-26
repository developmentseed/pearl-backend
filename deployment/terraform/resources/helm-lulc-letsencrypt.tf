resource "helm_release" "lulc-letsencrypt" {
  name             = ""
  chart            = "../../helm/lulc-letsencrypt"
  namespace        = "cert-manager"
  create_namespace = true
  set {
    name  = "email"
    value = var.letsencrypt_email
  } 
}