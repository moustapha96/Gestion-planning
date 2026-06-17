#!/usr/bin/env bash
#
# Installe les vhosts Nginx pour g-planning.tech-xuma.com et back-gp.tech-xuma.com
# Usage (root ou sudo) :
#   cd /var/www/gpadm
#   chmod +x deploy/scripts/install-nginx-tech-xuma.sh
#   sudo ./deploy/scripts/install-nginx-tech-xuma.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GPADM_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

FRONTEND_CONF="$GPADM_ROOT/deploy/nginx/frontend/g-planning.tech-xuma.com.conf"
BACKEND_CONF="$GPADM_ROOT/deploy/nginx/backend/back-gp.tech-xuma.com.conf"

if [[ $EUID -ne 0 ]]; then
    echo "ERREUR: exécutez avec sudo." >&2
    exit 1
fi

for f in "$FRONTEND_CONF" "$BACKEND_CONF"; do
    [[ -f "$f" ]] || { echo "Fichier introuvable: $f" >&2; exit 1; }
done

echo "[nginx] Copie des configurations..."
cp "$FRONTEND_CONF" /etc/nginx/sites-available/g-planning.tech-xuma.com.conf
cp "$BACKEND_CONF" /etc/nginx/sites-available/back-gp.tech-xuma.com.conf

ln -sf /etc/nginx/sites-available/g-planning.tech-xuma.com.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/back-gp.tech-xuma.com.conf /etc/nginx/sites-enabled/

echo "[nginx] Test de configuration..."
nginx -t

systemctl reload nginx

echo "[nginx] OK — sites activés."
echo "  Frontend : g-planning.tech-xuma.com"
echo "  Backend  : back-gp.tech-xuma.com"
echo ""
echo "Sans certificat TLS encore : commentez les blocs listen 443 dans les deux fichiers"
echo "ou lancez : certbot --nginx -d g-planning.tech-xuma.com -d back-gp.tech-xuma.com"
