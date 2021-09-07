variable "environment" {
  type = string
}

variable "domain" {
  type = string
  default = "lulcterraformdev.ds.io"
}

variable "admin_email" {
  type = string
}

variable "postgres_password" {
  type = string
}

variable "signing_secret" {
  type = string
}

variable "api_node_selector_key" {
  type = string
  default = "agentpool"
}

variable "api_node_selector_value" {
  type = string
  default = "gpunodepool"
}

variable "gpu_count" {
  type = number
  default = 15
}

variable "tiles_debug" {
  type = string
  default = "false"
}

variable "mosaic_backend" {
  type = string
  default = "sqlite:///"
}

variable "tiles_host" {
  type = string
  default = "/tmp/data/mosaics.db"
}

variable "tiles_webconcurrency" {
  type = string
  default = "1"
}

variable "placeholder_replica_count" {
  type = number
  default = 1
}

variable "placeholder_node_selector_name" {
  type = string
  default = "gpunodepool"
}

variable "placeholder_is_gpu" {
  type = string
  default = "true"
}

variable "placeholder_num_gpus" {
  type = number
  default = 2
}

variable "nginx_enabled" {
  type = string
  default = "false"
}

variable "frontend_domain" {
  type = string
  default = ""
}

variable "letsencrypt_email" {
  type = string
  default = "sanjay@developmentseed.org"
}

variable "region" {
  type = string
}

variable "aks_node_count" {
  type = number
  default = 1
}

variable "subscriptionId" {
  type = string
}

variable "servicePrincipalJSON" {
  type = string
}

# -----------------
# Attach ACR
# Defaults to common resources

variable "lulc_test_resources_acr" {
  type    = string
  default = "lulcterraformacr"
}

variable "lulc_test_resources_rg" {
  type = string
  default = "lulcterraformdev"
}

# -----------------
# Local variables

locals {
  stack_id              = "lulc"
  location              = lower(replace(var.region, " ", ""))
  prefix                = "${local.stack_id}-${var.environment}"
  prefixnodashes        = "${local.stack_id}${var.environment}"
  storage               = "${local.stack_id}${var.environment}"
  deploy_secrets_prefix = "${local.stack_id}-${var.environment}"

  backend_address_pool_name      = "${azurerm_virtual_network.lulc-cluster.name}-beap"
  frontend_port_name             = "${azurerm_virtual_network.lulc-gateway.name}-feport"
  frontend_ip_configuration_name = "${azurerm_virtual_network.lulc-gateway.name}-feip"
  http_setting_name              = "${azurerm_virtual_network.lulc-cluster.name}-be-htst"
  listener_name                  = "${azurerm_virtual_network.lulc-cluster.name}-httplstn"
  request_routing_rule_name      = "${azurerm_virtual_network.lulc-cluster.name}-rqrt"
  redirect_configuration_name    = "${azurerm_virtual_network.lulc-cluster.name}-rdrcfg"
}
