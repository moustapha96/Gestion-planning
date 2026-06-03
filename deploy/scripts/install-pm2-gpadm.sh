#!/usr/bin/env bash
#
# Installe / met à jour PM2 pour le backend GPADM (écosystème + démarrage au boot).
# Usage :
#   cd /var/www/gpadm
#   chmod +x deploy/scripts/install-pm2-gpadm.sh
#   ./deploy/scripts/install-pm2-gpadm.sh
#
# Option : désactiver le backend systemd pour éviter deux processus sur le port 3001 :
#   ./deploy/scripts/install-pm2-gpadm.sh --disable-systemd-backend
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-gpadm.sh
source "$SCRIPT_DIR/lib-gpadm.sh"

DISABLE_SYSTEMD_BACKEND=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            sed -n '3,14p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        --disable-systemd-backend) DISABLE_SYSTEMD_BACKEND=1; shift ;;
        *) die "Option inconnue : $1" ;;
    esac
done

require_gpadm_root
require_run_as_gpadm

command -v pm2 &>/dev/null || die "PM2 absent. Installez : npm install -g pm2"

mkdir -p "$GPADM_ROOT/backend/logs"

if [[ "$DISABLE_SYSTEMD_BACKEND" -eq 1 ]]; then
    log "Arrêt et désactivation systemd backend ($BACKEND_SERVICE)"
    sudo systemctl stop "$BACKEND_SERVICE" 2>/dev/null || true
    sudo systemctl disable "$BACKEND_SERVICE" 2>/dev/null || true
fi

cd "$GPADM_ROOT/backend"

export PM2_APP_NAME="${PM2_APP_NAME:-backend}"
export TZ="${TZ:-Africa/Dakar}"
export APP_TIMEZONE="${APP_TIMEZONE:-Africa/Dakar}"

if [[ ! -f .env ]]; then
    if [[ -f .env.production ]]; then
        warn ".env absent — copie depuis .env.production"
        cp .env.production .env
        chmod 600 .env 2>/dev/null || true
    else
        die "Créez backend/.env ou backend/.env.production avant PM2."
    fi
fi

log "Démarrage PM2 via ecosystem.config.cjs (app: $PM2_APP_NAME)"
if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
fi
pm2 start ecosystem.config.cjs
pm2 save

log "PM2 startup (commande à exécuter si proposée par pm2 startup) :"
pm2 startup systemd -u "$GPADM_USER" --hp "$(eval echo "~$GPADM_USER")" 2>/dev/null || pm2 startup || true

log "Statut :"
pm2 status
pm2 logs "$PM2_APP_NAME" --lines 20 --nostream || true

log "Logs en direct : pm2 logs $PM2_APP_NAME"
log "Santé API     : curl -sS http://127.0.0.1:3001/health"
