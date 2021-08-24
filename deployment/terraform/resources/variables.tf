variable "environment" {
  type = string
}

variable "region" {
  type = string
}

variable "aks_node_count" {
  type = number
  default = 1
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
