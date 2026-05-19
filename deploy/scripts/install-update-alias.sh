#!/usr/bin/env bash
#
# Installe un raccourci « gpadm-update » dans ~/bin pour l'utilisateur gpadm.
#
#   chmod +x /var/www/gpadm/deploy/scripts/install-update-alias.sh
#   /var/www/gpadm/deploy/scripts/install-update-alias.sh
#
set -euo pipefail

GPADM_ROOT="${GPADM_ROOT:-/var/www/gpadm}"
BIN_DIR="${HOME}/bin"
WRAPPER="$BIN_DIR/gpadm-update"

mkdir -p "$BIN_DIR"
cat > "$WRAPPER" <<EOF
#!/usr/bin/env bash
exec "$GPADM_ROOT/deploy/scripts/update-gpadm.sh" "\$@"
EOF
chmod +x "$WRAPPER"
chmod +x "$GPADM_ROOT/deploy/scripts/update-gpadm.sh"
chmod +x "$GPADM_ROOT/deploy/scripts/fix-uploads-permissions.sh"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    if ! grep -qF 'export PATH="$HOME/bin:$PATH"' "$HOME/.bashrc" 2>/dev/null; then
        echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.bashrc"
    fi
fi

echo "Installé : $WRAPPER"
echo "Utilisation : gpadm-update   ou   gpadm-update --theirs"
