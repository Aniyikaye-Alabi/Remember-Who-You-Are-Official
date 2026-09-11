output "public_ip" {
  description = "Put this in the GitHub secret DEPLOY_HOST"
  value       = azurerm_public_ip.main.ip_address
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh azureuser@${azurerm_public_ip.main.ip_address}"
}