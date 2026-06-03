# PM2 et fichier `.env` sur la VM GPADM

Arborescence : `/var/www/gpadm`

---

## 1. Mettre à jour le fichier d’environnement

Le backend lit **`/var/www/gpadm/backend/.env`** au démarrage (`dotenv` dans `server.js`).

### Modèle recommandé

1. Éditez **`backend/.env.production`** sur la VM (ou copiez-le depuis votre poste via `scp`).
2. Adaptez au minimum :
   - `DATABASE_URL`
   - `FRONTEND_URL` / `BACKEND_URL` (URL publique de la VM, ex. `http://10.5.49.131`)
   - `JWT_SECRET` / `JWT_REFRESH_SECRET`
   - `SMTP_*`
3. Appliquez vers `.env` :

```bash
cd /var/www/gpadm
chmod +x deploy/scripts/sync-env-gpadm.sh
./deploy/scripts/sync-env-gpadm.sh
```

Options :

```bash
# Voir les différences sans écraser
./deploy/scripts/sync-env-gpadm.sh --diff

# Appliquer + redémarrer (PM2 ou systemd)
./deploy/scripts/sync-env-gpadm.sh --restart
```

Ou en une commande avec la mise à jour complète du code :

```bash
./deploy/scripts/update-gpadm.sh --sync-env --pm2
```

Chaque sync crée une sauvegarde : `backend/.env.bak.YYYYMMDD-HHMMSS`.

---

## 2. Installer ou mettre à jour PM2

```bash
# En tant que gpadm
npm install -g pm2

cd /var/www/gpadm
chmod +x deploy/scripts/install-pm2-gpadm.sh
./deploy/scripts/install-pm2-gpadm.sh
```

Pour **ne pas** avoir deux backends (systemd + PM2 sur le port 3001) :

```bash
./deploy/scripts/install-pm2-gpadm.sh --disable-systemd-backend
```

Le frontend peut rester en **systemd** (`gestion-planning-frontend`) ou être servi par **Nginx** depuis `frontend/dist/`.

Configuration PM2 : `backend/ecosystem.config.cjs` (logs dans `backend/logs/pm2-*.log`).

---

## 3. Mise à jour applicative (code + env + PM2)

```bash
cd /var/www/gpadm
git pull origin main   # ou votre branche

# 1) Env
./deploy/scripts/sync-env-gpadm.sh

# 2) Code + npm + migrations + build + redémarrage PM2
./deploy/scripts/update-gpadm.sh --pm2
```

Tout-en-un :

```bash
./deploy/scripts/update-gpadm.sh --sync-env --pm2
```

---

## 4. Logs PM2 en direct

```bash
pm2 status
pm2 logs backend
pm2 logs backend --lines 100

# Fichiers
tail -f /var/www/gpadm/backend/logs/pm2-out.log
tail -f /var/www/gpadm/backend/logs/pm2-error.log
tail -f /var/www/gpadm/backend/logs/application.log
```

Après changement de `.env` :

```bash
cd /var/www/gpadm/backend
pm2 restart ecosystem.config.cjs --update-env
pm2 save
```

---

## 5. Vérifications

```bash
curl -sS http://127.0.0.1:3001/health
pm2 describe backend
```

Si le port 3001 est déjà pris par systemd :

```bash
sudo systemctl stop gestion-planning-backend
sudo systemctl disable gestion-planning-backend
pm2 restart ecosystem.config.cjs --update-env
```

---

## 6. Frontend et `VITE_API_URL`

Après changement d’URL publique, rebuild le frontend si l’API n’est pas sur la même origine :

```bash
cd /var/www/gpadm/frontend
# ex. echo 'VITE_API_URL=http://10.5.49.131' > .env.production.local
npm run build
sudo systemctl restart gestion-planning-frontend   # si preview systemd
# ou recharger nginx si dist servi par nginx
```
