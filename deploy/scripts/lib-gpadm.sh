#!/usr/bin/env bash
# Bibliothèque partagée — déploiement VM GPADM (/var/www/gpadm, utilisateur gpadm).
# Source : source "$(dirname "$0")/lib-gpadm.sh"

: "${GPADM_ROOT:=/var/www/gpadm}"
: "${GPADM_USER:=gpadm}"
: "${UPLOADS_GROUP:=www-data}"
: "${BACKEND_SERVICE:=gestion-planning-backend}"
: "${FRONTEND_SERVICE:=gestion-planning-frontend}"
: "${PM2_APP_NAME:=backend}"

log()  { echo "[gpadm] $*"; }
warn() { echo "[gpadm] ATTENTION: $*" >&2; }
die()  { echo "[gpadm] ERREUR: $*" >&2; exit 1; }

require_gpadm_root() {
    if [[ ! -f "$GPADM_ROOT/backend/server.js" ]]; then
        die "Backend introuvable : $GPADM_ROOT/backend/server.js"
    fi
    if [[ ! -d "$GPADM_ROOT/frontend" ]]; then
        die "Frontend introuvable : $GPADM_ROOT/frontend"
    fi
}

require_run_as_gpadm() {
    if [[ "$(id -un)" != "$GPADM_USER" ]]; then
        die "Exécutez ce script en tant que $GPADM_USER (connecté : $(id -un))."
    fi
}

git_current_branch() {
    git -C "$GPADM_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main"
}

# Droits code : gpadm possède tout le dépôt (git pull, npm install).
fix_code_ownership() {
    log "Propriété du dépôt → $GPADM_USER:$GPADM_USER"
    if [[ "$(id -u)" -eq 0 ]]; then
        chown -R "$GPADM_USER:$GPADM_USER" "$GPADM_ROOT"
    else
        sudo chown -R "$GPADM_USER:$GPADM_USER" "$GPADM_ROOT"
    fi
}

# Uploads : écriture gpadm + groupe www-data (service systemd souvent www-data).
# 2770 = rwxrwx--- + setgid (nouveaux fichiers héritent du groupe).
fix_uploads_permissions() {
    local uploads="$GPADM_ROOT/backend/uploads"
    mkdir -p "$uploads"/{avatars,meetings,missions,projects,directions,branding,reports,documents}

    log "Permissions uploads → $GPADM_USER:$UPLOADS_GROUP (2770 + setgid)"
    if [[ "$(id -u)" -eq 0 ]]; then
        chown -R "$GPADM_USER:$UPLOADS_GROUP" "$uploads"
        chmod -R 2770 "$uploads"
        find "$uploads" -type d -exec chmod g+s {} \;
    else
        sudo chown -R "$GPADM_USER:$UPLOADS_GROUP" "$uploads"
        sudo chmod -R 2770 "$uploads"
        sudo find "$uploads" -type d -exec chmod g+s {} \;
    fi

    # logs / backups si présents
    for sub in logs backups; do
        local d="$GPADM_ROOT/backend/$sub"
        [[ -d "$d" ]] || continue
        if [[ "$(id -u)" -eq 0 ]]; then
            chown -R "$GPADM_USER:$UPLOADS_GROUP" "$d"
            chmod -R 2770 "$d"
        else
            sudo chown -R "$GPADM_USER:$UPLOADS_GROUP" "$d"
            sudo chmod -R 2770 "$d"
        fi
    done

    warn "N'utilisez pas chmod 777 sur uploads (risque sécurité)."
}

ensure_gpadm_in_uploads_group() {
    if id -nG "$GPADM_USER" 2>/dev/null | grep -qw "$UPLOADS_GROUP"; then
        return 0
    fi
    log "Ajout de $GPADM_USER au groupe $UPLOADS_GROUP (sudo)"
    sudo usermod -aG "$UPLOADS_GROUP" "$GPADM_USER" 2>/dev/null || true
    warn "Si c'est la première fois, reconnectez la session SSH (groupe $UPLOADS_GROUP)."
}

backend_npm_update() {
    log "Backend : npm install + Prisma"
    cd "$GPADM_ROOT/backend"
    npm install
    npm run db:generate
    npx prisma migrate deploy
}

frontend_npm_build() {
    log "Frontend : npm install + build"
    cd "$GPADM_ROOT/frontend"
    npm install
    npm run build
}

uses_systemd() {
    systemctl list-unit-files "${BACKEND_SERVICE}.service" &>/dev/null \
        && systemctl is-enabled "${BACKEND_SERVICE}.service" &>/dev/null
}

uses_pm2() {
    command -v pm2 &>/dev/null && pm2 describe "$PM2_APP_NAME" &>/dev/null
}

log_timezone_hint() {
    log "Fuseau applicatif : Africa/Dakar (vérifiez TZ et APP_TIMEZONE dans backend/.env)"
}

restart_services() {
    local mode="${1:-auto}"

    if [[ "$mode" == "pm2" ]] || { [[ "$mode" == "auto" ]] && uses_pm2; }; then
        log "Redémarrage PM2 ($PM2_APP_NAME)"
        export TZ="${TZ:-Africa/Dakar}"
        export APP_TIMEZONE="${APP_TIMEZONE:-Africa/Dakar}"
        export PM2_APP_NAME
        cd "$GPADM_ROOT/backend"
        if [[ ! -f .env ]] && [[ -f .env.production ]]; then
            warn "backend/.env absent — exécutez ./deploy/scripts/sync-env-gpadm.sh"
        fi
        if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
            pm2 restart ecosystem.config.cjs --update-env
        elif [[ -f ecosystem.config.cjs ]]; then
            pm2 start ecosystem.config.cjs
            pm2 save
        else
            pm2 start server.js --name "$PM2_APP_NAME"
            pm2 save
        fi
        return 0
    fi

    if [[ "$mode" == "systemd" ]] || { [[ "$mode" == "auto" ]] && uses_systemd; }; then
        log "Redémarrage systemd ($BACKEND_SERVICE, $FRONTEND_SERVICE)"
        sudo systemctl restart "$BACKEND_SERVICE" "$FRONTEND_SERVICE"
        sudo systemctl --no-pager --full status "$BACKEND_SERVICE" || true
        return 0
    fi

    warn "Aucun service détecté (systemd / pm2). Redémarrez manuellement."
}
