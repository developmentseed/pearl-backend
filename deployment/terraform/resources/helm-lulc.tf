resource "helm_release" "lulc" {
  name  = "lulc-helm"
  chart = "../../helm/pearl-helm"
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
    name  = "api.signingSecret"
    value = var.signing_secret 
  }

  set {
    name  = "api.postgresUrl"
    value = "postgres://lulc:${var.postgres_password}@${azurerm_postgresql_flexible_server.lulc.fqdn}/lulc?sslmode=require"
  }

  set {
    name  = "api.azureStorageConnectionString"
    value = azurerm_storage_account.lulc.primary_connection_string
  }

  set {
    name  = "api.gpuCount"
    value = var.gpu_count
  }

  set {
    name  = "api.cpuCount"
    value = var.cpu_count
  }

  set {
    name = "api.auth0BaseUrl"
    value = var.auth0BaseUrl
  }
  set {
    name  = "tiles.debug"
    value = var.tiles_debug
  }

  set {
    name = "tiles.mosaicBackends"
    value = var.mosaic_backend
  }

  set {
    name = "tiles.mosaicHost"
    value = var.tiles_host
  }

  set {
    name = "tiles.webConcurrency"
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
    name = "nginx.frontendDomain"
    value = var.frontend_domain
  }
 
}
