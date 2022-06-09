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

variable "auth0BaseUrl" {
  type = string
}

variable "gpu_count" {
  type = number
  default = 4
}

variable "cpu_count" {
  type = number
  default = 10
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

variable "pc_tileurl" {
  type = string
  default = "https://planetarycomputer.microsoft.com"
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
  storage               = (var.environment == "production" ? "${local.stack_id}tf${var.environment}" : "${local.stack_id}${var.environment}")
  deploy_secrets_prefix = "${local.stack_id}-${var.environment}"
}
