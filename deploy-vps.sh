#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/lovblack}"
DOMAIN="${DOMAIN:-lovblack.online}"
PORT="${PORT:-8098}"
PM2_NAME="lovblack_master"
UPLOAD_DIR="/var/lib/lovablack/uploads"
ENV_FILE="$APP_DIR/.env.production"

if [[ $EUID -ne 0 ]]; then echo "Execute como root: sudo bash deploy-vps.sh"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx build-essential
command -v bun >/dev/null || curl -fsSL https://bun.sh/install | bash
export PATH="/root/.bun/bin:$PATH"
command -v pm2 >/dev/null || bun add -g pm2

systemctl enable --now postgresql nginx
install -d -o www-data -g www-data "$UPLOAD_DIR"

# Descobre a porta REAL do cluster nativo (outro Postgres/Docker pode ocupar 5432).
PGPORT_LOCAL="$(sudo -u postgres psql -tAc 'SHOW port' 2>/dev/null | tr -d '[:space:]')"
PGPORT_LOCAL="${PGPORT_LOCAL:-5432}"
echo "==> PostgreSQL nativo na porta $PGPORT_LOCAL"

# Reaproveita segredos ja existentes para nao invalidar o banco em reinstalacoes.
if [[ -f "$ENV_FILE" ]]; then
  OLD_URL="$(grep -m1 '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
  OLD_SECRET="$(grep -m1 '^SESSION_SECRET=' "$ENV_FILE" | cut -d= -f2-)"
  if [[ "$OLD_URL" =~ ^postgresql://lovblack:([^@]+)@ ]]; then DB_PASSWORD="${DB_PASSWORD:-${BASH_REMATCH[1]}}"; fi
  SESSION_SECRET="${SESSION_SECRET:-$OLD_SECRET}"
fi
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 24)}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"

sudo -u postgres psql -v ON_ERROR_STOP=1 --set=dbpass="$DB_PASSWORD" <<'SQL'
DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='lovblack') THEN CREATE ROLE lovblack LOGIN; END IF; END $$;
SELECT format('ALTER ROLE lovblack LOGIN PASSWORD %L', :'dbpass') \gexec
SELECT 'CREATE DATABASE lovblack OWNER lovblack' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='lovblack') \gexec
SQL

cat > "$ENV_FILE" <<ENV
NODE_ENV=production
PORT=$PORT
HOST=127.0.0.1
NITRO_PORT=$PORT
NITRO_HOST=127.0.0.1
DATABASE_URL=postgresql://lovblack:$DB_PASSWORD@127.0.0.1:$PGPORT_LOCAL/lovblack

SESSION_SECRET=$SESSION_SECRET
UPLOAD_DIR=$UPLOAD_DIR
PUBLIC_URL=https://$DOMAIN
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
FB_ACCESS_TOKEN=${FB_ACCESS_TOKEN:-}
FB_PIXEL_ID=${FB_PIXEL_ID:-}
ENV
chmod 600 "$ENV_FILE"

set -a; source "$ENV_FILE"; set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$APP_DIR/db/schema.sql"

cd "$APP_DIR"
bun install --frozen-lockfile

ADMIN_EMAIL="${ADMIN_EMAIL:-mro@gmail.com}"
if [[ -n "${ADMIN_PASSWORD:-}" ]]; then
  HASH="$(node -e "import('bcryptjs').then(m=>m.hash(process.argv[1],12)).then(console.log)" "$ADMIN_PASSWORD")"
  CODE="$(openssl rand -hex 4 | tr '[:lower:]' '[:upper:]')"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --set=email="$ADMIN_EMAIL" --set=hash="$HASH" --set=code="$CODE" <<'SQL'
INSERT INTO users(email,password_hash,full_name,language,access_password)
VALUES(lower(:'email'),:'hash','Administrador','pt',:'code')
ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,updated_at=now();
INSERT INTO user_roles(user_id,role) SELECT id,'admin' FROM users WHERE email=lower(:'email') ON CONFLICT DO NOTHING;
SQL
fi

rm -rf .output
bun run build
test -f .output/server/index.mjs

cat > ecosystem.config.cjs <<EOF
module.exports={apps:[{name:'$PM2_NAME',script:'.output/server/index.mjs',cwd:'$APP_DIR',instances:1,exec_mode:'fork',env:require('fs').readFileSync('$ENV_FILE','utf8').split('\n').filter(Boolean).reduce((a,l)=>{const i=l.indexOf('=');if(i>0)a[l.slice(0,i)]=l.slice(i+1);return a},{})}]};
EOF
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save --force
pm2 startup systemd -u root --hp /root >/tmp/lovblack-pm2-startup.txt || true

cat > /etc/nginx/sites-available/lovblack <<EOF
server {
  listen 80; listen [::]:80; server_name $DOMAIN www.$DOMAIN;
  client_max_body_size 310M;
  location / { proxy_pass http://127.0.0.1:$PORT; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; proxy_read_timeout 300; }
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
}
EOF
ln -sfn /etc/nginx/sites-available/lovblack /etc/nginx/sites-enabled/lovblack
# Isolamento: desativa apenas vhosts ANTIGOS deste dominio (outros sites ficam intactos).
for vhost in /etc/nginx/sites-enabled/*; do
  [[ -e "$vhost" ]] || continue
  [[ "$(basename "$vhost")" == "lovblack" ]] && continue
  if grep -Eq "server_name[^;]*(^|[[:space:]])(www\.)?${DOMAIN//./\\.}([[:space:]]|;)" "$vhost"; then
    if grep -Eq "server_name[^;]*" "$vhost" && ! grep -Eq "server_name[^;]*[[:space:]](?!www\.${DOMAIN})" "$vhost"; then :; fi
    echo "==> Desativando vhost antigo de $DOMAIN: $vhost"
    rm -f "$vhost"
  fi
done
nginx -t && systemctl reload nginx


for _ in {1..30}; do curl -fsS "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 1; done
curl -fsS "http://127.0.0.1:$PORT/" >/dev/null || { pm2 logs "$PM2_NAME" --lines 80 --nostream; exit 1; }
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --redirect -m "${SSL_EMAIL:-$ADMIN_EMAIL}" || true
echo "LOVABLACK implantado em https://$DOMAIN (porta interna $PORT)."
