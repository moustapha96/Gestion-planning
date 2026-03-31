# 🚀 Démarrage Rapide

## Prérequis
- Node.js 18+ installé
- npm ou yarn

## Démarrage en 3 étapes

### Option 1: Script Automatique (Windows)
```bash
start.bat
```

### Option 2: Script Automatique (Mac/Linux)
```bash
chmod +x start.sh
./start.sh
```

### Option 3: Manuel (Deux terminaux)

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npx prisma db push
node prisma/seed.js
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Accès à l'Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## Données de Test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@example.com | Admin123! |
| Consolidateur | mansour.bocoum@example.com | Consolidateur123! |
| DG | dg@example.com | DG123! |
| Responsable | responsable1@example.com | User123! |
| Responsable | responsable2@example.com | User123! |

## Fonctionnalités Disponibles

### Pour les Responsables
- ✅ Soumettre mon planning hebdomadaire
- ✅ Consulter le tableau de bord
- ✅ Créer des convocations
- ✅ Réserver des salles
- ✅ Répondre aux invitations

### Pour le Consolidateur
- ✅ Voir tous les plannings soumis
- ✅ Consolider les plannings
- ✅ Transmettre au DG

### Pour le DG
- ✅ Valider les plannings consolidés
- ✅ Retourner les plannings avec commentaires
- ✅ Vue d'ensemble de toutes les activités

### Pour l'Admin
- ✅ Gérer les utilisateurs
- ✅ Créer/modifier les salles
- ✅ Voir les logs d'audit
- ✅ Gérer les rôles et permissions

## Modules Disponibles

| Module | Description |
|--------|-------------|
| **Dashboard** | Vue d'ensemble avec indicateurs clés |
| **Planning** | Gestion des plannings hebdomadaires |
| **Réunions** | Création et gestion des convocations |
| **Salles** | Consultation et réservation des salles |
| **Admin** | Gestion des utilisateurs et salles |

## Exemples d'Utilisation

### Créer un Planning
1. Allez dans "Mon Planning"
2. Cliquez sur "Nouveau Planning"
3. Remplissez les événements
4. Cliquez sur "Soumettre"

### Convoquer une Réunion
1. Allez dans "Réunions"
2. Cliquez sur "Nouvelle Convocation"
3. Sélectionnez les participants et la salle
4. Cliquez sur "Envoyer"

### Réserver une Salle
1. Allez dans "Salles"
2. Cliquez sur "Réserver"
3. Choisissez la date et l'heure
4. Confirmez la réservation

## Troubleshooting

### Erreur "Port déjà utilisé"
```bash
# Pour Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Pour Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Erreur "Base de données verrouillée"
```bash
cd backend
rm prisma/dev.db
npx prisma db push
node prisma/seed.js
```

### CORS Error
Vérifier que le backend est bien en cours d'exécution sur http://localhost:3001

## Configuration Avancée

### Changer les ports

**Backend (.env):**
```
PORT=3002
```

**Frontend (vite.config.js):**
```js
server: {
  port: 5174,
}
```

### Utiliser PostgreSQL
```bash
# Installer PostgreSQL localement ou utiliser un cloud provider

# Mettre à jour .env
DATABASE_URL="postgresql://user:password@localhost:5432/gestion_planning"

# Mettre à jour schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# Appliquer les migrations
npx prisma migrate deploy
```

## Production

```bash
# Build frontend
cd frontend
npm run build

# Résultat dans: frontend/dist/

# Tests
npm run preview

# Deploy
# Voir les options dans README.md
```

## Pour Aller Plus Loin

- Documentation complète: **README.md**
- Spécifications: **cahier_des_charges.docx**
- API Docs: http://localhost:3001/health

---

**Besoin d'aide ?** Consultez le README.md principal pour plus de détails.
