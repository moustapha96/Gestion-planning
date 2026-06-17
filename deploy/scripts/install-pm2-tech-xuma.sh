#!/usr/bin/env bash
#
# PM2 pour tech-xuma.com (app gp-backend)
# Usage :
#   cd /var/www/gpadm
#   chmod +x deploy/scripts/install-pm2-tech-xuma.sh
#   ./deploy/scripts/install-pm2-tech-xuma.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-gpadm.sh
source "$SCRIPT_DIR/lib-gpadm.sh"

export GPADM_ROOT="${GPADM_ROOT:-$GPADM_ROOT}"
export PM2_APP_NAME="${PM2_APP_NAME:-gp-backend}"

require_gpadm_root
require_run_as_gpadm

command -v pm2 &>/dev/null || die "PM2 absent. Installez : npm install -g pm2"

mkdir -p "$GPADM_ROOT/backend/logs"

cd "$GPADM_ROOT/backend"

if [[ ! -f .env ]]; then
    if [[ -f "$GPADM_ROOT/deploy/env/backend.env.production.example" ]]; then
        warn ".env absent — copiez deploy/env/backend.env.production.example vers backend/.env"
    fi
    if [[ -f .env.production ]]; then
        cp .env.production .env
        chmod 600 .env 2>/dev/null || true
    else
        die "Créez backend/.env avant PM2."
    fi
fi

ECOSYSTEM="$GPADM_ROOT/deploy/pm2/ecosystem.config.cjs"
[[ -f "$ECOSYSTEM" ]] || die "Introuvable : $ECOSYSTEM"

log "Démarrage PM2 ($PM2_APP_NAME) via deploy/pm2/ecosystem.config.cjs"
if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
fi

export GPADM_ROOT
pm2 start "$ECOSYSTEM"
pm2 save
pm2 startup systemd -u "$GPADM_USER" --hp "$(eval echo "~$GPADM_USER")" 2>/dev/null || pm2 startup || true

pm2 status
log "Santé : curl -sS http://127.0.0.1:3001/health"
log "Logs  : pm2 logs $PM2_APP_NAME"
