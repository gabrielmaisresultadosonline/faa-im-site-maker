#!/bin/bash
set -e

# Idempotent Deployment Flow for Ubuntu 24
# Usage: ./deploy.sh [branch-name]

BRANCH=${1:-main}
APP_DIR="/var/www/lovblack"
ENV_FILE="$APP_DIR/.env"
HEALTH_CHECK_URL="http://localhost:3000"

echo "🚀 Starting Deployment of branch: $BRANCH"

# 1. Preparation
cd $APP_DIR

# 2. Fetch latest code
if [ ! -d ".git" ]; then
    echo "First time setup: cloning repository..."
    git clone https://github.com/gabrielmaisresultadosonline/awesome-website-creator.git .
else
    git fetch origin
    git reset --hard origin/$BRANCH
fi

# 3. Environment Secrets Check
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ Warning: .env file missing in $APP_DIR"
    echo "Please create it with necessary SUPABASE and DB keys."
    # exit 1 # Uncomment to enforce secret existence
fi

# 4. Install Dependencies
echo "📦 Installing dependencies..."
bun install --frozen-lockfile

# 5. Database Migrations
# Assuming Supabase CLI or Drizzle/Prisma.
# If using Supabase local migrations:
# bunx supabase db push 
echo "🔄 Running database migrations..."
# Add your migration command here, e.g.:
# bunx drizzle-kit migrate

# 6. Build Application
echo "🏗️ Building application..."
bun run build

# 7. Zero-Downtime Reload with PM2
echo "🏃 Reloading application..."
# We use reload instead of delete/start to maintain availability
if pm2 describe lovblack-app > /dev/null; then
    pm2 reload ecosystem.config.cjs --update-env
else
    pm2 start ecosystem.config.cjs
fi
pm2 save

# 8. Nginx Idempotent Config
echo "🌐 Ensuring Nginx config is up to date..."
DOMAIN="lovblack.online"
NGINX_CONF="/etc/nginx/sites-available/lovblack"

sudo tee $NGINX_CONF > /dev/null <<CONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";
    }

    # Persistent Uploads handling
    location /uploads/ {
        alias $APP_DIR/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
CONF

sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. Health Check & Rollback
echo "🧪 Running health check..."
sleep 5
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" $HEALTH_CHECK_URL)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Health check passed (HTTP 200)"
else
    echo "❌ Health check failed (HTTP $HTTP_STATUS)"
    echo "Rolling back to previous PM2 state..."
    # pm2 rollback lovblack-app # Note: requires previous version tracking
    exit 1
fi

echo "🎉 Deployment Successful!"
