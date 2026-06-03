# Services systemd — VM GPADM

Arborescence attendue sur la machine :

```text
/var/www/gpadm/
├── backend/          # API Node (écoute 127.0.0.1:3001)
│   ├── server.js
│   ├── .env
│   └── ...
└── frontend/         # Vite preview (écoute 0.0.0.0:9000, proxy → backend)
    ├── dist/         # obligatoire après npm run build
    └── ...
```

## Installation (VM)

```bash
cd /var/www/gpadm

# Backend
cd /var/www/gpadm/backend
npm install
# Créer / éditer .env (DATABASE_URL, JWT_SECRET, HOST=127.0.0.1, FRONTEND_URL, …)
npm run db:generate
npx prisma migrate deploy

# Frontend
cd /var/www/gpadm/frontend
npm install
npm run build

# Services (depuis le dépôt, dossier deploy/systemd)
chmod +x /var/www/gpadm/deploy/systemd/install-gpadm.sh
sudo /var/www/gpadm/deploy/systemd/install-gpadm.sh
# Utilisateur par défaut : www-data — autre user : sudo ./install-gpadm.sh monuser
```

## Comptes « side » (tous les rôles)

Un mot de passe commun, un compte par rôle (responsable, consolidateur, CP, SG, DG, admin, super admin) :

```bash
cd /var/www/gpadm/backend
npm run db:seed-side-accounts
# ou
chmod +x /var/www/gpadm/deploy/scripts/create-side-accounts.sh
sudo /var/www/gpadm/deploy/scripts/create-side-accounts.sh
```

Mot de passe par défaut : `Test@2026 !` — surcharge : `SIDE_ACCOUNTS_PASSWORD='MonMotDePasse' npm run db:seed-side-accounts`

| Rôle | Email |
|------|--------|
| RESPONSABLE | resp.test@adm.sn |
| CONSOLIDATEUR | consol.test@adm.sn |
| COORDINATEUR_PROJET | cp.test@adm.sn |
| SECRETAIRE_GENERAL | sg.test@adm.sn |
| DG | dg.test@adm.sn |
| ADMIN | admin.test@adm.sn |
| SUPER_ADMIN | superadmin@adm.sn |

## Fuseau horaire (Dakar)

L’application utilise **`Africa/Dakar`** (GMT, pas de changement d’heure été/hiver) :

- Variables dans `backend/.env` : `APP_TIMEZONE=Africa/Dakar`, `TZ=Africa/Dakar`, `BACKUP_CRON_TIMEZONE=Africa/Dakar`
- Services systemd : `Environment=TZ=Africa/Dakar` (templates `.in`)
- Crons (rapport lundi 8h, rappels J-1, etc.) déclenchés à **8h heure de Dakar**, même si le serveur est en UTC ou Europe/Paris

Après modification des unités systemd :

```bash
sudo /var/www/gpadm/deploy/systemd/install-gpadm.sh gpadm
sudo systemctl daemon-reload
sudo systemctl restart gestion-planning-backend gestion-planning-frontend
```

Optionnel sur la VM (système) : `sudo timedatectl set-timezone Africa/Dakar` — l’app ne dépend pas du fuseau OS grâce à `TZ` dans les services.

## Mises à jour (utilisateur `gpadm`)

Scripts dans `deploy/scripts/` — à exécuter **connecté en `gpadm`** (pas en root) :

```bash
cd /var/www/gpadm
chmod +x deploy/scripts/*.sh

# Mise à jour complète (git + npm + migrations + build + redémarrage)
./deploy/scripts/update-gpadm.sh

# Si conflits Git : garder la version du dépôt distant
./deploy/scripts/update-gpadm.sh --theirs

# Tout écraser avec le dépôt distant
./deploy/scripts/update-gpadm.sh --hard

# Backend PM2 au lieu de systemd
./deploy/scripts/update-gpadm.sh --pm2

# Mettre à jour .env depuis .env.production + déploiement
./deploy/scripts/update-gpadm.sh --sync-env --pm2
```

Voir aussi **`deploy/PM2_ENV.md`** (PM2, `.env`, logs).

# Raccourci shell « gpadm-update »
./deploy/scripts/install-update-alias.sh
```

**Permissions uploads** (ne pas utiliser `chmod 777`) :

```bash
./deploy/scripts/fix-uploads-permissions.sh
# Équivalent manuel : gpadm:www-data, 2770, setgid sur backend/uploads/
```

Installation systemd avec l’utilisateur `gpadm` :

```bash
sudo ./deploy/systemd/install-gpadm.sh gpadm
```

## Commandes

```bash
sudo systemctl status gestion-planning-backend
sudo systemctl status gestion-planning-frontend
sudo systemctl restart gestion-planning-backend gestion-planning-frontend
journalctl -u gestion-planning-backend -f

# Backend sous PM2
pm2 logs backend -f
```

## Fichiers générés

- `/etc/systemd/system/gestion-planning-backend.service`
- `/etc/systemd/system/gestion-planning-frontend.service`

`WorkingDirectory` : `/var/www/gpadm/backend` et `/var/www/gpadm/frontend`.
