#!/usr/bin/env bash
#
# Installe les unités systemd pour le backend et le frontend (Ubuntu / systemd).
# Usage :
#   sudo ./install-systemd-services.sh /chemin/absolu/vers/Gestion-planning [utilisateur]
#
# Exemple :
#   sudo ./install-systemd-services.sh /home/ubuntu/Gestion-planning ubuntu
#
# Prérequis :
#   - Node.js et npm accessibles pour l’utilisateur cible (nvm : préférer un shell login pour détecter node).
#   - backend/.env configuré (DATABASE_URL, JWT_SECRET, FRONTEND_URL = URL réelle du navigateur, ex. http://IP:9000).
#   - Une fois : cd frontend && npm install && npm run build
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:?Indiquez le chemin absolu vers la racine du dépôt (ex: /home/ubuntu/Gestion-planning)}"
RUN_USER="${2:-${SUDO_USER:-}}"

if [[ "$(id -u)" -ne 0 ]]; then
    echo "Exécutez ce script avec sudo."
    exit 1
fi

if [[ -z "$RUN_USER" ]] || ! id "$RUN_USER" &>/dev/null; then
    echo "Utilisateur invalide ou vide. Usage: sudo $0 \"$ROOT\" <utilisateur_linux>"
    exit 1
fi

RUN_GROUP="$(id -gn "$RUN_USER")"
ROOT="$(readlink -f "$ROOT")"

if [[ ! -f "$ROOT/backend/server.js" ]]; then
    echo "Répertoire invalide : $ROOT (server.js introuvable)."
    exit 1
fi

if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
    echo "Le frontend n’est pas buildé : lancez d’abord :"
    echo "  cd \"$ROOT/frontend\" && npm install && npm run build"
    exit 1
fi

# Résoudre Node.js dans l’environnement de l’utilisateur cible (nvm, fnm, etc.)
NODE_BIN="$(sudo -H -u "$RUN_USER" bash -lc 'command -v node')"
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
    echo "Impossible de trouver node exécutable pour l’utilisateur $RUN_USER."
    echo "Installez Node (ou configurez nvm dans un shell login) puis réessayez."
    exit 1
fi

NODE_DIR="$(dirname "$NODE_BIN")"
echo "ROOT=$ROOT"
echo "RUN_USER=$RUN_USER"
echo "NODE_BIN=$NODE_BIN"

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
echo "Services installés et démarrés."
echo "  sudo systemctl status gestion-planning-backend"
echo "  sudo systemctl status gestion-planning-frontend"
echo "  journalctl -u gestion-planning-backend -f"
echo ""
echo "Backend : http://127.0.0.1:3001 (ou selon PORT dans backend/.env)"
echo "Frontend : http://0.0.0.0:9000 — alignez FRONTEND_URL dans backend/.env sur l’URL utilisée dans le navigateur (CORS)."
