#!/usr/bin/env bash
#
# Synchronise backend/.env à partir de .env.production (avec sauvegarde).
# À exécuter sur la VM en tant que gpadm :
#   cd /var/www/gpadm
#   ./deploy/scripts/sync-env-gpadm.sh
#   ./deploy/scripts/sync-env-gpadm.sh --from .env.production
#   ./deploy/scripts/sync-env-gpadm.sh --diff   # compare sans écraser
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-gpadm.sh
source "$SCRIPT_DIR/lib-gpadm.sh"

SOURCE_NAME=".env.production"
DIFF_ONLY=0
RESTART_AFTER=0

usage() {
    sed -n '3,12p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage ;;
        --from)     SOURCE_NAME="${2:?}"; shift 2 ;;
        --diff)     DIFF_ONLY=1; shift ;;
        --restart)  RESTART_AFTER=1; shift ;;
        *) die "Option inconnue : $1" ;;
    esac
done

require_gpadm_root
require_run_as_gpadm

BACKEND="$GPADM_ROOT/backend"
TARGET="$BACKEND/.env"
SOURCE="$BACKEND/$SOURCE_NAME"

[[ -f "$SOURCE" ]] || die "Fichier source introuvable : $SOURCE"

if [[ "$DIFF_ONLY" -eq 1 ]]; then
    if [[ -f "$TARGET" ]]; then
        log "Diff $SOURCE_NAME → .env"
        diff -u "$TARGET" "$SOURCE" || true
    else
        warn ".env absent — contenu de $SOURCE_NAME :"
        head -n 30 "$SOURCE"
    fi
    exit 0
fi

if [[ -f "$TARGET" ]]; then
    STAMP="$(date +%Y%m%d-%H%M%S)"
    cp "$TARGET" "$BACKEND/.env.bak.$STAMP"
    log "Sauvegarde : .env.bak.$STAMP"
fi

cp "$SOURCE" "$TARGET"
chmod 600 "$TARGET" 2>/dev/null || true
log ".env mis à jour depuis $SOURCE_NAME"
warn "Vérifiez FRONTEND_URL, BACKEND_URL, DATABASE_URL et SMTP avant redémarrage."

if [[ "$RESTART_AFTER" -eq 1 ]]; then
    restart_services "auto"
fi
