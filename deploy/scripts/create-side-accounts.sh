#!/usr/bin/env bash
#
# Crée les comptes « side » (tous les rôles) sur la VM GPADM.
# Usage :
#   sudo -u www-data ./deploy/scripts/create-side-accounts.sh
#   cd /var/www/gpadm/backend && sudo -u www-data npm run db:seed-side-accounts
#
set -euo pipefail

GPADM_ROOT="${GPADM_ROOT:-/var/www/gpadm}"
BACKEND="$GPADM_ROOT/backend"

if [[ ! -f "$BACKEND/prisma/seed-test-accounts.js" ]]; then
    echo "Fichier introuvable : $BACKEND/prisma/seed-test-accounts.js"
    exit 1
fi

if [[ ! -f "$BACKEND/.env" ]]; then
    echo "Créez d'abord $BACKEND/.env (DATABASE_URL, …)"
    exit 1
fi

cd "$BACKEND"
export NODE_ENV="${NODE_ENV:-production}"

RUN_AS="${SUDO_USER:-www-data}"
if [[ "$(id -u)" -eq 0 ]] && id "$RUN_AS" &>/dev/null; then
    exec sudo -u "$RUN_AS" bash -lc "cd '$BACKEND' && npm run db:seed-side-accounts"
else
    npm run db:seed-side-accounts
fi
