resource "helm_release" "lulc" {
  name  = "lulc-helm"
  chart = "../../helm/lulc-helm"
  wait = false
  depends_on = [
    helm_release.lulc-ingress-nginx,
    helm_release.lulc-cert-manager
  ]
  set {
    name  = "environment"
    value = var.environment
  }

  set {
    name  = "domain"
    value = var.domain
  }

  set {
    name = "adminEmail"
    value = var.admin_email
  }
  
  set {
    name  = "api.env.SigningSecret"
    value = var.signing_secret 
  }

  set {
    name  = "api.env.Postgres"
    value = "postgres://lulc:${var.postgres_password}@${azurerm_postgresql_flexible_server.lulc.fqdn}/lulc?sslmode=require"
  }

  set {
    name  = "api.env.AZURE_STORAGE_CONNECTION_STRING"
    value = azurerm_storage_account.lulc.primary_connection_string
  }

  set {
    name  = "api.env.nodeSelectorKey"
    value = var.api_node_selector_key
  }

  set {
    name  = "api.env.nodeSelectorValue"
    value = var.api_node_selector_value
  }

  set {
    name  = "api.env.GpuCount"
    value = var.gpu_count
  }

  set {
    name  = "api.env.CpuCount"
    value = var.cpu_count
  }

  set {
    name = "api.env.auth0BaseUrl"
    value = var.auth0BaseUrl
  }
  set {
    name  = "tiles.env.Debug"
    value = var.tiles_debug
  }

  set {
    name = "tiles.env.Backends"
    value = var.mosaic_backend
  }

  set {
    name = "tiles.env.Host"
    value = var.tiles_host
  }

  set {
    name = "tiles.env.WebConcurrency"
    value = var.tiles_webconcurrency
  }

  set {
    name = "placeholder.replicaCount"
    value = var.placeholder_replica_count
  }

  set {
    name = "placeholder.nodeSelectorName"
    value = var.placeholder_node_selector_name
  }

  set {
    name = "placeholder.isGpu"
    value = var.placeholder_is_gpu
  }

  set {
    name = "placeholder.numGPUs"
    value = var.placeholder_num_gpus
  }

  set {
    name = "nginx.enabled"
    value = var.nginx_enabled
  }

  set {
    name = "nginx.env.FRONTEND_DOMAIN"
    value = var.frontend_domain
  }
 
}