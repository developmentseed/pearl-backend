resource "helm_release" "lulc-keda" {
  name             = "keda"
  chart            = "kedacore/keda"
  namespace        = "keda"
  create_namespace = true 
}