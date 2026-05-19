#!/usr/bin/env bash
#
# Mise à jour applicative VM GPADM — utilisateur gpadm, racine /var/www/gpadm
#
# Usage :
#   cd /var/www/gpadm
#   chmod +x deploy/scripts/update-gpadm.sh
#   ./deploy/scripts/update-gpadm.sh              # pull classique (ff-only)
#   ./deploy/scripts/update-gpadm.sh --theirs      # conflits → version distante
#   ./deploy/scripts/update-gpadm.sh --hard        # écrase tout avec origin/<branche>
#   ./deploy/scripts/update-gpadm.sh --skip-git      # sans git (npm + build + restart)
#   ./deploy/scripts/update-gpadm.sh --skip-frontend
#   ./deploy/scripts/update-gpadm.sh --pm2           # redémarrage PM2 au lieu de systemd
#   ./deploy/scripts/update-gpadm.sh --branch main
#
# Prérequis :
#   - Compte gpadm, dépôt git dans /var/www/gpadm
#   - backend/.env configuré (DATABASE_URL, JWT_SECRET, FRONTEND_URL, SMTP…)
#   - sudo sans mot de passe pour systemctl restart (recommandé) OU PM2 pour le backend
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-gpadm.sh
source "$SCRIPT_DIR/lib-gpadm.sh"

GIT_MODE="pull"
SKIP_GIT=0
SKIP_FRONTEND=0
RESTART_MODE="auto"
GIT_BRANCH=""

usage() {
    sed -n '3,22p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage ;;
        --hard)     GIT_MODE="hard"; shift ;;
        --theirs)   GIT_MODE="theirs"; shift ;;
        --skip-git) SKIP_GIT=1; shift ;;
        --skip-frontend) SKIP_FRONTEND=1; shift ;;
        --pm2)      RESTART_MODE="pm2"; shift ;;
        --systemd)  RESTART_MODE="systemd"; shift ;;
        --branch)   GIT_BRANCH="${2:?--branch requiert un nom}"; shift 2 ;;
        *) die "Option inconnue : $1 ( --help )" ;;
    esac
done

require_gpadm_root
require_run_as_gpadm
ensure_gpadm_in_uploads_group

cd "$GPADM_ROOT"

if [[ -z "$GIT_BRANCH" ]]; then
    GIT_BRANCH="$(git_current_branch)"
fi

if [[ "$SKIP_GIT" -eq 0 ]]; then
    log "Git : fetch origin"
    git fetch origin

    case "$GIT_MODE" in
        hard)
            log "Git : reset --hard origin/$GIT_BRANCH"
            git reset --hard "origin/$GIT_BRANCH"
            ;;
        theirs)
            log "Git : merge -X theirs origin/$GIT_BRANCH"
            git merge -X theirs "origin/$GIT_BRANCH"
            ;;
        pull)
            log "Git : pull --ff-only origin $GIT_BRANCH"
            if ! git pull --ff-only origin "$GIT_BRANCH"; then
                warn "Fast-forward impossible. Essayez --theirs ou --hard, ou résolvez les conflits à la main."
                exit 1
            fi
            ;;
        *)
            die "Mode git inconnu : $GIT_MODE"
            ;;
    esac
else
    log "Git ignoré (--skip-git)"
fi

fix_code_ownership
fix_uploads_permissions
backend_npm_update

if [[ "$SKIP_FRONTEND" -eq 0 ]]; then
    frontend_npm_build
else
    log "Build frontend ignoré (--skip-frontend)"
fi

restart_services "$RESTART_MODE"

log_timezone_hint
log "Mise à jour terminée."
log "Vérifications : curl -sS http://127.0.0.1:3001/health"
log "              sudo systemctl status $BACKEND_SERVICE $FRONTEND_SERVICE"
