#!/usr/bin/env bash
#
# Réinitialise complètement PM2 pour gpadm (kill + purge ~/.pm2) et
# reconfigure le démarrage automatique au boot pour le backend GPADM.
# Idempotent : peut être relancé sans risque.
#
# Corrige les pièges rencontrés en prod :
#   - mauvais --hp (l'unité pointait vers /home/gpadm alors que le vrai
#     $HOME de gpadm, et donc PM2_HOME, est /var/www/gpadm) ;
#   - ~/.pm2 appartenant à root après une commande pm2 lancée par erreur
#     en tant que root (EACCES sur pm2.log / rpc.sock / pub.sock) ;
#   - unité systemd modifiée sur disque mais jamais rechargée
#     (`systemctl daemon-reload` oublié ou mal tapé) ;
#   - démarrage de server.js en direct, qui ignore NODE_ENV/TZ/logs
#     définis dans deploy/pm2/ecosystem.config.cjs.
#
# Usage (en root, sur la VM) :
#   cd /var/www/gpadm
#   chmod +x deploy/scripts/setup-pm2-startup-gpadm.sh
#   sudo ./deploy/scripts/setup-pm2-startup-gpadm.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-gpadm.sh
source "$SCRIPT_DIR/lib-gpadm.sh"

[[ "$(id -u)" -eq 0 ]] || die "Exécutez ce script avec sudo/root (il gère systemd + chown)."

require_gpadm_root
command -v pm2 &>/dev/null || die "PM2 absent. Installez : npm install -g pm2"
id "$GPADM_USER" &>/dev/null || die "Utilisateur $GPADM_USER introuvable."

GPADM_HOME="$(getent passwd "$GPADM_USER" | cut -d: -f6)"
[[ -n "$GPADM_HOME" ]] || die "Impossible de déterminer le \$HOME de $GPADM_USER."
PM2_HOME="$GPADM_HOME/.pm2"
UNIT_NAME="pm2-${GPADM_USER}"
UNIT_FILE="/etc/systemd/system/${UNIT_NAME}.service"

log "Utilisateur : $GPADM_USER   Home : $GPADM_HOME   PM2_HOME : $PM2_HOME"

# 1) Repartir d'une base saine : supprimer toute unité précédente
#    (évite qu'un --hp périmé traîne dans un fichier non régénéré).
if [[ -f "$UNIT_FILE" ]]; then
    log "Suppression de l'unité existante $UNIT_FILE"
    systemctl stop "$UNIT_NAME" 2>/dev/null || true
    systemctl disable "$UNIT_NAME" 2>/dev/null || true
    rm -f "$UNIT_FILE"
    systemctl daemon-reload
    systemctl reset-failed "$UNIT_NAME" 2>/dev/null || true
fi

# 2) Réinitialiser complètement PM2 pour gpadm : tue le daemon et purge
#    ~/.pm2 (évite tout état/permissions corrompus par un lancement
#    précédent en root — cause n°1 des échecs EACCES observés).
log "Purge de l'état PM2 existant"
su - "$GPADM_USER" -c "pm2 kill" 2>/dev/null || true
rm -rf "$PM2_HOME"
mkdir -p "$PM2_HOME"
chown -R "$GPADM_USER:$GPADM_USER" "$PM2_HOME"

# 3) Démarrer le backend depuis zéro via l'ecosystem (conserve NODE_ENV,
#    TZ, fichiers de logs, max_memory_restart — ne pas lancer server.js
#    en direct, sinon deploy/pm2/ecosystem.config.cjs est ignoré).
log "Démarrage du backend (en tant que $GPADM_USER, app: $PM2_APP_NAME)"
su - "$GPADM_USER" -c "cd '$GPADM_ROOT/backend' && PM2_APP_NAME='$PM2_APP_NAME' pm2 start ecosystem.config.cjs && pm2 save"

# 4) Générer l'unité systemd avec le --hp correct, puis l'installer.
log "Génération de l'unité systemd (pm2 startup)"
STARTUP_CMD="$(su - "$GPADM_USER" -c "pm2 startup systemd -u '$GPADM_USER' --hp '$GPADM_HOME'" | grep -E '^sudo ' || true)"
[[ -n "$STARTUP_CMD" ]] || die "pm2 startup n'a pas produit de commande sudo — relancez avec la sortie complète pour diagnostiquer."
log "Exécution : $STARTUP_CMD"
eval "$STARTUP_CMD"

# 5) Recharger systemd (obligatoire après écriture de l'unité) et
#    sauvegarder l'état PM2 courant (relu au boot par `pm2 resurrect`).
systemctl daemon-reload
su - "$GPADM_USER" -c "pm2 save"

# 6) Activer + démarrer, puis vérifier.
systemctl enable "$UNIT_NAME"
systemctl restart "$UNIT_NAME"
sleep 2

log "Statut :"
systemctl status "$UNIT_NAME" --no-pager || true

if systemctl is-active --quiet "$UNIT_NAME"; then
    log "OK — ${UNIT_NAME}.service actif et activé au boot."
else
    warn "Le service n'est pas actif. Diagnostic : journalctl -xeu $UNIT_NAME"
    exit 1
fi
