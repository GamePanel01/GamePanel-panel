########################################
# Install script for the Web Panel     #
# This script will install the Web Panel and its dependencies on your system.
# It is recommended to run this script as root or with sudo privileges.
########################################
# Creator: Korbinian Musch
# License: MIT License
# Date Created: 06.06.2026
########################################
#!/bin/bash

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo privileges."
  exit 1
fi

# Update the package list and install dependencies
echo "Updating package list and installing dependencies..."
apt update
apt install -y python3 python3-pip python3-venv apache2 libapache2-mod-wsgi-py3 ldap-utils git wget docker-compose docker-cli docker.io openssl

# Generate a random password for the LDAP admin user
LDAP_ADMIN_PASSWORD=$(openssl rand -base64 12)
echo "Generated LDAP admin password: $LDAP_ADMIN_PASSWORD"

# Docker LDAP server setup
echo "Setting up Docker LDAP server..."
mkdir -p /opt/ldap/
cat <<EOL > /opt/ldap/docker-compose.yml
version: '3'
services:
  ldap:
    image: osixia/openldap:1.5.0
    container_name: ldap
    environment:
      - LDAP_DOMAIN=gamepanel.local
      - LDAP_ADMIN_USERNAME=admin
      - LDAP_ADMIN_PASSWORD=$LDAP_ADMIN_PASSWORD
      - LDAP_BASE_DN=dc=gamepanel,dc=local
      - LDAP_TLS=false
      - LDAP_ORGANISATION=GamePanel
      - LDAP_LOG_LEVEL=256
      - network_mode=127.0.0.1
    ports:
      - "389:389"
    volumes:
      - ldap_data:/var/lib/ldap
      - ldap_config:/etc/ldap/slapd.d
volumes:
  ldap_data:
  ldap_config:
EOL

# Start the Docker LDAP server
echo "Starting the Docker LDAP server..."
cd /opt/ldap/
docker-compose up -d

# Download the Web Panel source code
echo "Downloading the Web Panel source code..."
git clone https://github.com/Korbinian0/GameServer-Gateway.git
cd /tmp/
cd GameServer-Gateway

# Copy the Web Panel files to the Apache web directory
echo "Copying Web Panel files to the Apache web directory..."
cp -r panel/*.html /var/www/html/
cp -r panel/*.css /var/www/html/
cp -r panel/*.js /var/www/html/

# Copy the python files to the appropriate location and create the directory if it doesn't exist
mkdir -p /opt/webpanel/
cp -r panel/python_scripts.py /opt/webpanel/

# Set the correct permissions for the Web Panel files
echo "Setting permissions for the Web Panel files..."
chown -R www-data:www-data /var/www/html/
chown -R root:root /opt/webpanel/
chmod -R 755 /var/www/html/
chmod -R 755 /opt/webpanel/

# Create the Systemd service file for the Web Panel
echo "Creating Systemd service file for the Web Panel..."
cat <<EOL > /etc/systemd/system/webpanel-ldap.service
[Unit]
Description=Web Panel LDAP Service
After=network.target

[Service]
User=root
WorkingDirectory=/opt/webpanel/
ExecStart=/usr/bin/python3 /opt/webpanel/python_scripts.py
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Reload Systemd to apply the new service file
echo "Reloading Systemd..."
systemctl daemon-reload

# Set the LDAP admin password in the Web Panel configuration
echo "Configuring the Web Panel with the LDAP admin password..."
sed -i "s/LDAP_PASSWORD/$LDAP_ADMIN_PASSWORD/g" /opt/webpanel/python_scripts.py

# Enable and start the Web Panel service
echo "Enabling and starting the Web Panel LDAP service..."
systemctl enable webpanel-ldap.service
systemctl start webpanel-ldap.service

# Restart Apache to apply changes
echo "Restarting Apache..."
systemctl restart apache2

# Remove the downloaded source code
echo "Cleaning up..."
rm -rf /tmp/GameServer-Gateway/

# Final message
echo "Web Panel installation and configuration complete. The Web Panel should now be accessible via your web browser. Please ensure that your LDAP server is running and properly configured to allow the Web Panel to authenticate users."
