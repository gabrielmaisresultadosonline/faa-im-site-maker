#!/bin/bash
set -e

# Idempotent Ubuntu 24 Setup Script
# Handles: PostgreSQL, Bun, Nginx, UFW, PM2, Certbot

echo "--- Starting Idempotent Server Setup ---"

# 1. Update and Essential Tools
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential software-properties-common libssl-dev ufw

# 2. PostgreSQL Setup (Idempotent)
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
fi

# 3. Bun Runtime Setup
if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    # Make bun available in this session and for future ones
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi

# 4. PM2 & Global Tools
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    # We need Node for PM2, Ubuntu 24 comes with 20.x or we can use Bun's node compat
    sudo apt install -y nodejs npm
    sudo npm install -g pm2
fi

# 5. Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# 6. Firewall Hardening
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 7. Create App Directory
APP_DIR="/var/www/lovblack"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
# 8. Uploads Directory
mkdir -p $APP_DIR/public/uploads
chmod 775 $APP_DIR/public/uploads

echo "--- Setup Complete ---"
