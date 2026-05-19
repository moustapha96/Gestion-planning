#!/usr/bin/env bash
#
# Corrige les droits sur backend/uploads (sans mise à jour git/npm).
#
# Usage (utilisateur gpadm) :
#   cd /var/www/gpadm
#   chmod +x deploy/scripts/fix-uploads-permissions.sh
#   ./deploy/scripts/fix-uploads-permissions.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-gpadm.sh
source "$SCRIPT_DIR/lib-gpadm.sh"

require_gpadm_root
require_run_as_gpadm
ensure_gpadm_in_uploads_group
fix_uploads_permissions
log "Terminé."
