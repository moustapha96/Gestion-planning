# Nginx — Gestion Planning (tech-xuma.com)

Deux sous-domaines distincts :

| Domaine | Rôle | Fichier |
|---------|------|---------|
| `g-planning.tech-xuma.com` | Frontend (SPA React, `frontend/dist`) | `frontend/g-planning.tech-xuma.com.conf` |
| `back-gp.tech-xuma.com` | Backend API + uploads + Socket.IO | `backend/back-gp.tech-xuma.com.conf` |

## Prérequis DNS

Pointer les enregistrements **A** (ou CNAME) vers l’IP de la VM :

```
g-planning.tech-xuma.com  →  IP_VM
back-gp.tech-xuma.com     →  IP_VM
```

## 1. Variables d’environnement

### Backend (`backend/.env`)

```env
FRONTEND_URL=https://g-planning.tech-xuma.com
BACKEND_URL=https://back-gp.tech-xuma.com
PORT=3001
NODE_ENV=production
```

Modèle complet : `deploy/env/backend.env.production.example`

### Frontend (build)

Créer `frontend/.env.production` avant `npm run build` :

```env
VITE_API_URL=https://back-gp.tech-xuma.com
VITE_APP_TIMEZONE=UTC
```

Modèle : `deploy/env/frontend.env.production.example`

## 2. PM2 (backend)

```bash
export GPADM_ROOT=/var/www/gpadm
cd "$GPADM_ROOT/backend"
mkdir -p logs
pm2 start ../deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup   # suivre les instructions affichées
```

Vérification :

```bash
curl -sS http://127.0.0.1:3001/health
pm2 logs gp-backend --lines 50
```

## 3. Build frontend

```bash
cd /var/www/gpadm/frontend
cp ../deploy/env/frontend.env.production.example .env.production
# éditer si besoin
npm ci
npm run build
```

## 4. Installation Nginx

```bash
cd /var/www/gpadm

sudo cp deploy/nginx/frontend/g-planning.tech-xuma.com.conf /etc/nginx/sites-available/
sudo cp deploy/nginx/backend/back-gp.tech-xuma.com.conf /etc/nginx/sites-available/

sudo ln -sf /etc/nginx/sites-available/g-planning.tech-xuma.com.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/back-gp.tech-xuma.com.conf /etc/nginx/sites-enabled/

# Premier déploiement sans TLS : commenter les blocs listen 443 et ssl_*
# dans les deux fichiers, ne garder que listen 80, puis :
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Certificats TLS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d g-planning.tech-xuma.com -d back-gp.tech-xuma.com
```

Renouvellement automatique : géré par le timer `certbot`.

## 6. Script d’installation rapide

```bash
chmod +x deploy/scripts/install-nginx-tech-xuma.sh
sudo ./deploy/scripts/install-nginx-tech-xuma.sh
```

## 7. Chemins à adapter

Si le dépôt n’est pas dans `/var/www/gpadm`, modifier dans les fichiers Nginx :

- `root /var/www/gpadm/frontend/dist;` (frontend)
- Variable `GPADM_ROOT` pour PM2

## 8. Vérifications finales

```bash
curl -sS https://back-gp.tech-xuma.com/health
curl -sS -o /dev/null -w "%{http_code}\n" https://g-planning.tech-xuma.com/
```

Depuis le navigateur : connexion sur `https://g-planning.tech-xuma.com` — les appels API partent vers `https://back-gp.tech-xuma.com/api/...` (CORS autorisé via `FRONTEND_URL`).
