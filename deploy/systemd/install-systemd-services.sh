#!/usr/bin/env bash
#
# Installe les unités systemd pour le backend et le frontend (Ubuntu / systemd).
#
# Usage :
#   sudo ./install-systemd-services.sh
#   sudo ./install-systemd-services.sh /var/www/gpadm
#   sudo ./install-systemd-services.sh /var/www/gpadm www-data
#
# Défaut VM GPADM : racine /var/www/gpadm, utilisateur www-data
#   backend  → /var/www/gpadm/backend
#   frontend → /var/www/gpadm/frontend
#
# Prérequis :
#   - Node.js pour l’utilisateur cible (/usr/bin/node ou nvm)
#   - /var/www/gpadm/backend/.env (DATABASE_URL, JWT_SECRET, FRONTEND_URL, …)
#   - /var/www/gpadm/frontend/dist/index.html (npm run build)
#
set -euo pipefail

GPADM_ROOT="/var/www/gpadm"
GPADM_USER="www-data"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:-$GPADM_ROOT}"
RUN_USER="${2:-$GPADM_USER}"

if [[ "$(id -u)" -ne 0 ]]; then
    echo "Exécutez ce script avec sudo."
    exit 1
fi

if ! id "$RUN_USER" &>/dev/null; then
    echo "Utilisateur invalide : $RUN_USER"
    exit 1
fi

RUN_GROUP="$(id -gn "$RUN_USER")"
ROOT="$(readlink -f "$ROOT")"

if [[ ! -f "$ROOT/backend/server.js" ]]; then
    echo "Répertoire invalide : $ROOT"
    echo "  Attendu : $ROOT/backend/server.js"
    exit 1
fi

if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
    echo "Frontend non buildé. Exécutez :"
    echo "  cd \"$ROOT/frontend\" && npm install && npm run build"
    exit 1
fi

resolve_node() {
    local bin
    bin="$(sudo -H -u "$RUN_USER" bash -lc 'command -v node' 2>/dev/null || true)"
    if [[ -n "$bin" && -x "$bin" ]]; then
        echo "$bin"
        return 0
    fi
    if command -v node &>/dev/null; then
        echo "$(command -v node)"
        return 0
    fi
    return 1
}

if ! NODE_BIN="$(resolve_node)"; then
    echo "Node introuvable pour $RUN_USER ni pour root."
    echo "  sudo apt install -y nodejs   # ou configurez nvm pour $RUN_USER"
    exit 1
fi

NODE_DIR="$(dirname "$NODE_BIN")"

# Droits lecture/exécution pour l’utilisateur du service
chown -R "$RUN_USER:$RUN_GROUP" "$ROOT/backend/uploads" 2>/dev/null || true
chown -R "$RUN_USER:$RUN_GROUP" "$ROOT/backend/logs" 2>/dev/null || true
chown -R "$RUN_USER:$RUN_GROUP" "$ROOT/backend/backups" 2>/dev/null || true

echo "ROOT=$ROOT"
echo "RUN_USER=$RUN_USER"
echo "NODE_BIN=$NODE_BIN"
echo "  backend  → $ROOT/backend"
echo "  frontend → $ROOT/frontend"

replace() {
    sed -e "s|__ROOT__|${ROOT//|/\\|}|g" \
        -e "s|__RUN_USER__|$RUN_USER|g" \
        -e "s|__RUN_GROUP__|$RUN_GROUP|g" \
        -e "s|__NODE_BIN__|${NODE_BIN//|/\\|}|g" \
        -e "s|__NODE_DIR__|${NODE_DIR//|/\\|}|g" "$1"
}

replace "$SCRIPT_DIR/gestion-planning-backend.service.in" >/etc/systemd/system/gestion-planning-backend.service
replace "$SCRIPT_DIR/gestion-planning-frontend.service.in" >/etc/systemd/system/gestion-planning-frontend.service

chmod 644 /etc/systemd/system/gestion-planning-backend.service
chmod 644 /etc/systemd/system/gestion-planning-frontend.service

systemctl daemon-reload
systemctl enable gestion-planning-backend.service gestion-planning-frontend.service
systemctl restart gestion-planning-backend.service
sleep 2
systemctl restart gestion-planning-frontend.service

echo ""
echo "Services installés."
echo "  sudo systemctl status gestion-planning-backend"
echo "  sudo systemctl status gestion-planning-frontend"
echo "  journalctl -u gestion-planning-backend -f"
echo ""
echo "Backend  : http://127.0.0.1:3001  (fichier .env : $ROOT/backend/.env)"
echo "Frontend : http://0.0.0.0:9000   (FRONTEND_URL dans .env = URL du navigateur)"
