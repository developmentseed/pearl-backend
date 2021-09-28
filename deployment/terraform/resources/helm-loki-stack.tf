resource "helm_release" "lulc-loki-stack" {
  name             = "loki-stack"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki-stack"
  namespace        = "loki-stack"
  create_namespace = true

  set {
    name  = "promtail.enabled"
    value = "true"
  }

  set {
    name = "loki.persistence.enabled"
    value = "true"
  }

  set {
    name = "loki.persistence.size"
    value = "40Gi"
  }

  set {
    name = "grafana.enabled"
    value = "true"
  }

}