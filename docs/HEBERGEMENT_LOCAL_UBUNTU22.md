# Hébergement local sur Ubuntu 22.04 LTS — PostgreSQL, backend, frontend

Ce document décrit **étape par étape** l’installation de l’application **Gestion Planning** sur une machine **Ubuntu 22.04** (Jammy), avec **PostgreSQL**, le **backend Node.js** et le **frontend Vite + React**.

**Chemins sur la VM de production / hébergement :** le dépôt est sous **`/var/www/gpadm`** :

```text
/var/www/gpadm/backend/    ← API Node (.env, server.js)
/var/www/gpadm/frontend/   ← application React (dist/ après build)
```

Pour un poste de développement, vous pouvez utiliser `~/Gestion-planning` à la place de `/var/www/gpadm` dans les commandes ci-dessous.

---

## Table des matières

1. [Vue d’ensemble des ports](#1-vue-densemble-des-ports)
2. [Étape A — Mise à jour du système et outils de base](#2-étape-a--mise-à-jour-du-système-et-outils-de-base)
3. [Étape B — Installation de PostgreSQL](#3-étape-b--installation-de-postgresql)
4. [Étape C — Node.js (recommandé : nvm)](#4-étape-c--nodejs-recommandé--nvm)
5. [Étape D — Récupérer le code du projet](#5-étape-d--récupérer-le-code-du-projet)
6. [Étape E — Backend : dépendances, variables d’environnement, Prisma](#6-étape-e--backend--dépendances-variables-denvironnement-prisma)
7. [Étape F — Démarrer le backend](#7-étape-f--démarrer-le-backend)
8. [Étape G — Frontend : dépendances et lancement](#8-étape-g--frontend--dépendances-et-lancement)
9. [Étape H — Vérifications (navigateur, API, Swagger)](#9-étape-h--vérifications-navigateur-api-swagger)
10. [Étape I — Email SMTP en local (optionnel)](#10-étape-i--email-smtp-en-local-optionnel)
11. [Étape J — Build de production du frontend (optionnel)](#11-étape-j--build-de-production-du-frontend-optionnel)
12. [Dépannage](#12-dépannage)

---

## 1. Vue d’ensemble des ports

| Service    | Port / interface | URL locale typique        |
|-----------|------------------|---------------------------|
| Backend   | **3001** sur **127.0.0.1** uniquement | `http://127.0.0.1:3001` (pas exposé sur le réseau) |
| Frontend (Vite) | **9000** sur toutes interfaces (`0.0.0.0`) | `http://localhost:9000` ou `http://IP:9000` |
| PostgreSQL | **5432** (écoute locale) | `localhost` |

Le navigateur ne parle **pas** directement au backend : le frontend (Vite) **proxy** `/api`, `/uploads` et `/socket.io` vers `http://127.0.0.1:3001`.

**Important — CORS et cookies :** le backend n’autorise par défaut qu’**une** origine frontend (`FRONTEND_URL`). Le fichier `frontend/vite.config.js` fixe le serveur de dev sur le port **9000**. Il faut donc définir `FRONTEND_URL=http://localhost:9000` (voir étape E), sinon le navigateur peut bloquer les requêtes ou le chargement des ressources protégées par la politique de sécurité.

Les WebSockets (Socket.IO) sont proxifiés par Vite vers le backend en dev (`/socket.io` → `http://localhost:3001`).

---

## 2. Étape A — Mise à jour du système et outils de base

Ouvrez un terminal et exécutez :

```bash
sudo apt update
sudo apt upgrade -y
```

Installez les paquets utiles pour compiler des modules natifs (ex. `sharp`) et pour Git :

```bash
sudo apt install -y build-essential git curl ca-certificates
```

---

## 3. Étape B — Installation de PostgreSQL

### B.1 Installer le serveur PostgreSQL

Sur Ubuntu 22.04, le méta-paquet `postgresql` installe généralement **PostgreSQL 14** :

```bash
sudo apt install -y postgresql postgresql-contrib
```

Vérifiez que le service tourne :

```bash
sudo systemctl status postgresql
```

Si besoin, démarrez-le :

```bash
sudo systemctl enable --now postgresql
```

### B.2 Créer un utilisateur et une base dédiés à l’application

Connectez-vous en super-utilisateur PostgreSQL (utilisateur système `postgres`) :

```bash
sudo -u postgres psql
```

Dans l’invite `postgres=#`, exécutez (remplacez `gestion_planning_app` et `mot_de_passe_solide` par vos valeurs) :

```sql
CREATE USER gestion_planning_app WITH PASSWORD 'mot_de_passe_solide';
CREATE DATABASE gestion_planning OWNER gestion_planning_app;
GRANT ALL PRIVILEGES ON DATABASE gestion_planning TO gestion_planning_app;
\c gestion_planning
GRANT ALL ON SCHEMA public TO gestion_planning_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gestion_planning_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gestion_planning_app;
\q
```

**Note :** sur PostgreSQL 15+, les droits par défaut sur le schéma `public` peuvent différer ; sur Ubuntu 22 avec PG 14, les commandes ci-dessus suffisent en général.

### B.3 Chaîne de connexion `DATABASE_URL` (format Prisma)

Pour un serveur local, utilisateur `gestion_planning_app`, mot de passe `mot_de_passe_solide`, base `gestion_planning` :

```text
postgresql://gestion_planning_app:mot_de_passe_solide@localhost:5432/gestion_planning?schema=public
```

Si votre mot de passe contient des caractères spéciaux (`@`, `#`, `%`, etc.), il doit être **encodé en URL** (ex. `@` → `%40`).

### B.4 (Optionnel) Accès depuis une autre machine

Par défaut, PostgreSQL n’écoute que sur `127.0.0.1`. Pour un hébergement **uniquement local**, ne changez rien. Si un jour vous exposez la base, il faudrait adapter `postgresql.conf` et `pg_hba.conf` — ce guide se limite au **local**.

---

## 4. Étape C — Node.js (recommandé : nvm)

Le projet utilise des versions récentes de **Vite** et **React**. Installez une **LTS récente** (Node **20** ou **22**).

Avec [nvm](https://github.com/nvm-sh/nvm) :

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Fermez et rouvrez le terminal, ou :

```bash
source ~/.bashrc
```

Puis :

```bash
nvm install 22
nvm use 22
node -v
npm -v
```

---

## 5. Étape D — Récupérer le code du projet

Si le projet est sur Git :

```bash
cd ~
git clone <URL_DU_DEPOT> Gestion-planning
cd Gestion-planning
```

Sinon, copiez le dossier du projet sur la machine Ubuntu et placez-vous à sa racine :

```bash
cd ~/Gestion-planning
```

Vérifiez la présence des dossiers `backend/` et `frontend/`.

---

## 6. Étape E — Backend : dépendances, variables d’environnement, Prisma

### E.1 Installer les dépendances npm

```bash
cd ~/Gestion-planning/backend
npm install
```

### E.2 Fichier `.env`

Créez le fichier `backend/.env` (il n’est en principe **pas** versionné) :

```bash
cd ~/Gestion-planning/backend
nano .env
```

Contenu **minimal recommandé** pour un poste de développement local avec le frontend sur le port **9000** :

```env
# Base PostgreSQL (obligatoire en prod ; obligatoire pour ce guide)
DATABASE_URL="postgresql://gestion_planning_app:mot_de_passe_solide@localhost:5432/gestion_planning?schema=public"

# Secret JWT — utilisez une longue chaîne aléatoire en local aussi
JWT_SECRET="changez-moi-par-une-chaine-longue-et-aleatoire"

# Backend : écoute locale uniquement (recommandé avec frontend en proxy)
HOST=127.0.0.1
PORT=3001

# Origine du frontend (CORS + CSP connectSrc) — doit correspondre à l’URL du navigateur
FRONTEND_URL="http://localhost:9000"

# Liens absolus dans certains emails (API non exposée : garder 127.0.0.1 ou l’URL du proxy public)
# BACKEND_URL="http://127.0.0.1:3001"

NODE_ENV=development
```

Enregistrez (`Ctrl+O`, `Entrée`) et quittez (`Ctrl+X`).

**Variables souvent utiles plus tard (non obligatoires pour un premier démarrage) :**

| Variable | Rôle |
|----------|------|
| `HOST` | Interface d’écoute du backend (`127.0.0.1` par défaut ; ne pas mettre `0.0.0.0` sauf besoin explicite) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Envoi d’emails (Nodemailer) ; par défaut le code pointe vers `localhost:1025` sans auth |
| `SWAGGER_USER`, `SWAGGER_PASS` | Protège `/api/docs` si `NODE_ENV=production` |
| `FIREBASE_*` | Notifications push (mobile) |
| `DISABLE_BACKUP_CRON=true` | Désactive le cron de sauvegarde `pg_dump` si vous ne voulez pas de backups automatiques en dev |
| `PG_DUMP_PATH`, `PSQL_PATH` | Binaires personnalisés pour les sauvegardes |

### E.3 Générer le client Prisma

```bash
cd ~/Gestion-planning/backend
npm run db:generate
```

### E.4 Appliquer les migrations sur la base vide

Le dépôt contient des migrations SQL dans `backend/prisma/migrations/`. Pour une base **neuve** :

```bash
cd ~/Gestion-planning/backend
npx prisma migrate deploy
```

Cela crée toutes les tables attendues par le schéma Prisma actuel.

**Alternative en développement expérimental** (peut réécrire le schéma sans historique de migration propre) :

```bash
npx prisma db push
```

Pour un premier poste Ubuntu + PostgreSQL, **`migrate deploy`** est préférable.

### E.5 Peupler des données de démonstration (seed)

Le script `prisma/seed.js` crée des utilisateurs et des salles de test. Il suppose une base **vide** (emails uniques). Lancez-le **une fois** après les migrations :

```bash
cd ~/Gestion-planning/backend
npm run db:seed
```

Identifiants de test habituels (voir aussi `README.md` à la racine du projet) :

- Admin : `admin@example.com` / `Admin123!`
- Consolidateur : `mansour.bocoum@example.com` / `Consolidateur123!`
- DG : `dg@example.com` / `DG123!`
- Responsables : `responsable1@example.com` … `responsable5@example.com` / `User123!`

Si le seed échoue car les données existent déjà, vous pouvez repartir de zéro (**destructif**) :

```bash
cd ~/Gestion-planning/backend
npx prisma migrate reset --force
npm run db:seed
```

`migrate reset` supprime les données, réapplique les migrations ; le seed **n’est pas** relié automatiquement à Prisma dans ce dépôt, il faut lancer `npm run db:seed` ensuite. Le script npm `db:reset` exécute uniquement `prisma migrate reset --force` (sans seed).

---

## 7. Étape F — Démarrer le backend

### Mode développement (rechargement automatique avec nodemon)

```bash
cd ~/Gestion-planning/backend
npm run dev
```

### Mode sans nodemon

```bash
npm start
```

Vous devez voir dans la console une ligne du type : serveur sur le port **3001**, et l’URL Swagger : `http://localhost:3001/api/docs`.

Laissez ce terminal ouvert.

---

## 8. Étape G — Frontend : dépendances et lancement

Ouvrez un **second** terminal.

### G.1 Installer les dépendances

```bash
cd ~/Gestion-planning/frontend
npm install
```

### G.2 Variables d’environnement (optionnel en dev)

En développement, le proxy Vite redirige `/api`, `/uploads` et `/socket.io` vers `http://localhost:3001`. Vous **n’avez pas** besoin de `VITE_API_URL` si le backend tourne sur la même machine et le port 3001.

Si vous créez un fichier `frontend/.env` pour documenter la prod :

```bash
cp .env.example .env
# En local avec proxy : laissez VITE_API_URL commenté ou vide.
```

### G.3 Lancer le serveur de développement

```bash
cd ~/Gestion-planning/frontend
npm run dev
```

Par configuration Vite du projet, l’URL affichée sera du type **`http://localhost:9000`** (et non 5173).

---

## 9. Étape H — Vérifications (navigateur, API, Swagger)

1. Ouvrez **`http://localhost:9000`** — la page de connexion de l’application doit s’afficher.
2. Connectez-vous avec un compte seed (ex. `admin@example.com` / `Admin123!`).
3. Swagger : depuis la **même machine**, `http://127.0.0.1:3001/api/docs` (le backend n’est pas joignable depuis une autre machine si `HOST=127.0.0.1`). En développement, l’accès est en général ouvert ; en production, une authentification basique peut être exigée via `SWAGGER_USER` / `SWAGGER_PASS`.

Si la page web affiche des erreurs réseau ou CORS, vérifiez que **`FRONTEND_URL`** dans `backend/.env` est exactement l’URL affichée dans la barre d’adresse du navigateur (protocole, hôte, port).

---

## 10. Étape I — Email SMTP en local (optionnel)

Par défaut, le backend utilise souvent **localhost:1025** (adapté à un relais de test type **MailHog** ou **Mailpit**). Pour installer MailHog via binaire (exemple) ou utiliser Docker, référez-vous à la documentation de l’outil choisi, puis alignez `SMTP_HOST` et `SMTP_PORT` dans `backend/.env`.

Sans serveur SMTP, les envois peuvent échouer silencieusement ou générer des erreurs dans les logs ; l’application peut toutefois fonctionner pour la plupart des écrans sans email.

---

## 11. Étape J — Build de production du frontend (optionnel)

Pour générer les fichiers statiques :

```bash
cd ~/Gestion-planning/frontend
npm run build
```

Le dossier `frontend/dist/` contient le site. Pour prévisualiser localement :

```bash
npm run preview
```

En **production réelle**, définissez `VITE_API_URL` vers l’URL publique du backend (sans `/api` final ; le client ajoute `/api`). Le proxy Vite n’existe pas dans la build statique : sans `VITE_API_URL`, les appels API peuvent être incorrects.

Servir `dist/` avec **nginx**, **Caddy** ou un bucket + CDN dépasse le cadre de ce guide « local Ubuntu ».

---

## 12. Dépannage

### Erreur Prisma au démarrage : connexion PostgreSQL refusée

- Vérifiez `sudo systemctl status postgresql`.
- Vérifiez `DATABASE_URL` (hôte, port, nom de base, utilisateur, mot de passe encodé).

### Erreur « password authentication failed »

- Vérifiez le mot de passe dans `DATABASE_URL` et dans `CREATE USER`.
- Vérifiez `pg_hba.conf` (méthode `scram-sha-256` / `md5` pour `localhost`).

### CORS ou page blanche / API bloquée

- Alignez **`FRONTEND_URL`** avec l’URL réelle du frontend (**`http://localhost:9000`** en dev selon ce projet).
- Redémarrez le backend après modification de `.env`.

### Port 3001 ou 9000 déjà utilisé

- Backend : `PORT=3002 npm run dev` (et adaptez le proxy dans `vite.config.js` ou utilisez la même valeur dans la cible du proxy).
- Frontend : `npx vite --port 9100` (et mettez à jour `FRONTEND_URL` en conséquence).

### Seed qui échoue (contrainte d’unicité sur l’email)

- La base contient déjà des utilisateurs. Utilisez `npx prisma migrate reset --force` en **développement uniquement**, ou supprimez manuellement les lignes concernées.

### Sauvegardes automatiques et `pg_dump`

Le backend peut planifier des sauvegardes PostgreSQL. En dev, vous pouvez désactiver le cron :

```env
DISABLE_BACKUP_CRON=true
```

Assurez-vous que le paquet client PostgreSQL est installé si vous utilisez les backups :

```bash
sudo apt install -y postgresql-client
```

---

## Récapitulatif des commandes (après installation système)

```text
# Terminal 1 — PostgreSQL (une fois)
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql  # puis CREATE USER / DATABASE / droits

# Backend (VM : /var/www/gpadm/backend)
cd /var/www/gpadm/backend
npm install
# .env : DATABASE_URL, JWT_SECRET, HOST=127.0.0.1, FRONTEND_URL=http://IP_VM:9000
npm run db:generate
npx prisma migrate deploy
npm run db:seed

# Frontend
cd /var/www/gpadm/frontend
npm install
npm run build

# Services systemd (une fois)
sudo /var/www/gpadm/deploy/systemd/install-gpadm.sh

# Navigateur : http://IP_DE_LA_VM:9000
```

## Services systemd (VM `/var/www/gpadm`)

Arborescence :

| Chemin | Rôle |
|--------|------|
| `/var/www/gpadm/backend` | API — `WorkingDirectory`, fichier `.env` |
| `/var/www/gpadm/frontend` | UI — `vite preview` après `npm run build` |

1. Copier l’exemple d’environnement et éditer `.env` :

```bash
sudo cp /var/www/gpadm/deploy/systemd/gpadm/backend.env.example /var/www/gpadm/backend/.env
sudo nano /var/www/gpadm/backend/.env
```

2. Build frontend :

```bash
cd /var/www/gpadm/frontend && npm install && npm run build
```

3. Installer les services (défaut : `/var/www/gpadm` + utilisateur `www-data`) :

```bash
chmod +x /var/www/gpadm/deploy/systemd/install-gpadm.sh
sudo /var/www/gpadm/deploy/systemd/install-gpadm.sh
```

Ou explicitement :

```bash
sudo /var/www/gpadm/deploy/systemd/install-systemd-services.sh /var/www/gpadm www-data
```

Le **backend** écoute sur **`127.0.0.1:3001`**. Le **frontend** sur **`0.0.0.0:9000`** proxy vers le backend. Détail : **`deploy/systemd/README.md`**.

```bash
sudo systemctl status gestion-planning-backend
sudo systemctl restart gestion-planning-backend gestion-planning-frontend
ss -tlnp | grep -E '3001|9000'
```

Ce document reflète la structure et les scripts du dépôt au moment de sa rédaction ; en cas de divergence, les fichiers `package.json`, `vite.config.js`, `backend/server.js` et `backend/prisma/schema.prisma` font foi.
