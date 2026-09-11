resource "azurerm_resource_group" "main" {
    name = "${var.prefix}-rg"
    location = var.location
}

resource "azurerm_virtual_network" "main" {
    name = "${var.prefix}-vnet"
    address_space = ["10.0.0.0/16"]
    location = azurerm_resource_group.main.location
    resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_subnet" "main" {
    name = "${var.prefix}-subnet"
    resource_group_name = azurerm_resource_group.main.name
    virtual_network_name = azurerm_virtual_network.main.name
    address_prefixes = ["10.0.1.0/24"]
}

resource "azurerm_public_ip" "main" {
  name                = "${var.prefix}-ip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"   # Dynamic changes on reboot. Never do that.
  sku                 = "Standard"
}

resource "azurerm_network_security_group" "main" {
    name = "${var.prefix}-nsg"
    location = azurerm_resource_group.main.location
    resource_group_name = azurerm_resource_group.main.name

    security_rule {
        name = "ssh"
        priority = 100
        direction = "Inbound"
        access = "Allow"
        protocol = "Tcp"
        source_port_range = "*"
        destination_port_range = "22"
        source_address_prefix = "*"
        destination_address_prefix = "*"
    }

    security_rule {
        name = "http"
        priority = 110
        direction = "Inbound"
        access = "Allow"
        protocol = "Tcp"
        source_port_range = "*"
        destination_port_ranges = ["80", "443"]
        source_address_prefix = "Internet"
        destination_address_prefix = "*"
    }
}

resource "azurerm_network_interface" "main" {
  name                = "${var.prefix}-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }
}

resource "azurerm_network_interface_security_group_association" "main" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.main.id
}

resource "azurerm_linux_virtual_machine" "main" {
    name = "${var.prefix}-vm"
    location = azurerm_resource_group.main.location
    resource_group_name = azurerm_resource_group.main.name
    size = var.vm_size
    admin_username = "azureuser"
    network_interface_ids = [azurerm_network_interface.main.id]

    admin_ssh_key {
        username = "azureuser"
        public_key = var.admin_ssh_public_key
    }

    os_disk {
        caching = "ReadWrite"
        storage_account_type = "Standard_LRS"
    }

      source_image_reference {
        publisher = "Canonical"
        offer     = "ubuntu-24_04-lts"
        sku       = "server"
        version   = "latest"
    }

    # the first-boot script
    custom_data = base64encode(templatefile("${path.module}/cloud-init.yaml", {
        deploy_key = var.deploy_ssh_public_key
    }))
}