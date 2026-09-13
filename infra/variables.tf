variable "subscription_id" {
  type        = string
  description = "Azure subscription GUID from 'az account show --query id' command"
}

variable "prefix" {
  type    = string
  default = "rwya"
}

variable "location" {
  type        = string
  default     = "westeurope"
  description = "Azure region to deploy resources"
}

variable "vm_size" {
  type    = string
  default = "Standard_D2s_v3" # Standard_B1s is for 1vCPU and 1GB RAM.
}

variable "admin_ssh_public_key" {
  type        = string
  description = "Contents of your ~/.ssh/id_ed25519.pub -- your human key"
}

variable "deploy_ssh_public_key" {
  type        = string
  description = "Public half of the CI-only key pair"
}