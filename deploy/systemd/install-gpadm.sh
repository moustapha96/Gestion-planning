#!/usr/bin/env bash
#
# Installation des services systemd pour la VM GPADM (/var/www/gpadm).
# Équivalent à :
#   sudo ./install-systemd-services.sh /var/www/gpadm www-data
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/install-systemd-services.sh" /var/www/gpadm "${1:-www-data}"
