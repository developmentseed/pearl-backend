resource "helm_release" "lulc" {
  name             = "keda"
  repository       = "kedacore/keda"
  namespace        = "keda"
  create_namespace = true 
}