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

## Commandes

```bash
sudo systemctl status gestion-planning-backend
sudo systemctl status gestion-planning-frontend
sudo systemctl restart gestion-planning-backend gestion-planning-frontend
journalctl -u gestion-planning-backend -f
```

## Fichiers générés

- `/etc/systemd/system/gestion-planning-backend.service`
- `/etc/systemd/system/gestion-planning-frontend.service`

`WorkingDirectory` : `/var/www/gpadm/backend` et `/var/www/gpadm/frontend`.
