# PM2 — Gestion Planning

## Fichiers

| Fichier | Description |
|---------|-------------|
| `deploy/pm2/ecosystem.config.cjs` | Configuration principale (app `gp-backend`) |
| `ecosystem.config.cjs` (racine) | Raccourci vers la config ci-dessus |
| `backend/ecosystem.config.cjs` | Même config, lancement depuis `backend/` |

## Installation rapide (VM)

```bash
export GPADM_ROOT=/var/www/gpadm
cd "$GPADM_ROOT"
chmod +x deploy/scripts/install-pm2-tech-xuma.sh
./deploy/scripts/install-pm2-tech-xuma.sh
```

## Commandes utiles

```bash
pm2 status
pm2 logs gp-backend
pm2 restart gp-backend --update-env
pm2 save

tail -f /var/www/gpadm/backend/logs/pm2-out.log
tail -f /var/www/gpadm/backend/logs/application.log
```

## Variables

- `GPADM_ROOT` — chemin du dépôt (défaut `/var/www/gpadm`)
- `PM2_APP_NAME` — nom du processus (défaut `gp-backend`)
- Toutes les variables métier : `backend/.env`

## Nom d'app legacy

L'ancien nom `backend` est remplacé par `gp-backend` pour tech-xuma. Pour conserver `backend` :

```bash
export PM2_APP_NAME=backend
pm2 start deploy/pm2/ecosystem.config.cjs
```
