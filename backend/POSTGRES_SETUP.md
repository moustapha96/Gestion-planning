# Configuration PostgreSQL

Le backend utilise **PostgreSQL** comme base de données.

## 1. Installer PostgreSQL

- Windows : https://www.postgresql.org/download/windows/
- Ou via Docker : `docker run -d -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=planning postgres:15`

## 2. Créer la base de données

Si elle n'existe pas, créez la base `planning` :

```sql
CREATE DATABASE planning;
```

(Utilisateur par défaut : `postgres`, ou celui défini dans votre installation.)

## 3. Configurer le fichier `.env`

Dans `backend/.env`, adaptez l’URL avec vos identifiants :

```env
DATABASE_URL="postgresql://USER:MOT_DE_PASSE@localhost:5432/planning?schema=public"
```

Remplacez `USER` et `MOT_DE_PASSE` par votre utilisateur et mot de passe PostgreSQL.

## 4. Migrations et seed

À la racine du dossier **backend** :

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables (première fois)
npx prisma migrate dev --name init_postgres

# (Optionnel) Remplir les données de test
npm run db:seed
```

Si vous préférez synchroniser le schéma sans historique de migrations (dév uniquement) :

```bash
npx prisma db push
npm run db:seed
```

## 5. Démarrer le serveur

```bash
npm run dev
```


Poussez la base de données

npx prisma db push
npx prisma db push --force-reset

npx prisma generate       

sudo systemctl restart applyons