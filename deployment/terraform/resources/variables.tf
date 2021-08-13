variable "environment" {
  type = string
}

variable "region" {
  type = string
}

variable "aks_node_count" {
  type = number
}

# -----------------
# Attach ACR
# Defaults to common resources

variable "lulc_test_resources_acr" {
  type    = string
  default = "lulctest"
}

variable "lulc_test_resources_rg" {
  type = string
  default = "lulctest"
}

variable "lulc_test_resources_kv" {
  type    = string
  default = "lulctest"
}

# -----------------
# Local variables

locals {
  stack_id              = "lulc"
  location              = lower(replace(var.region, " ", ""))
  prefix                = "${local.stack_id}-${var.environment}"
  storage               = "${local.stack_id}${var.environment}"
  deploy_secrets_prefix = "${local.stack_id}-${var.environment}"
}
