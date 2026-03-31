# Application de Gestion des Plannings

Une application web complète pour gérer les plannings hebdomadaires, les convocations de réunions et les salles de réunion.

## Structure du Projet

```
d:/Gestion planning/
├── backend/           # Server Node.js + Express
│   ├── prisma/        # Configuration Prisma + seed
│   ├── src/           # Code source backend
│   │   ├── routes/    # API routes
│   │   ├── middlewares/
│   │   ├── services/
│   │   └── utils/
│   ├── server.js      # Point d'entrée
│   └── .env           # Variables d'environnement
├── frontend/          # Application React + Vite
│   ├── src/
│   │   ├── pages/     # Pages (Login, Dashboard, Planning, etc)
│   │   ├── components/
│   │   ├── api/       # Client API
│   │   └── index.css  # Styles Tailwind
│   └── vite.config.js
└── README.md
```

## Démarrage Rapide

### 1. Initialiser le Backend

```bash
cd backend
npm install
npx prisma db push          # Créer la base de données
node prisma/seed.js         # Peupler les données de test
npm run dev                 # Démarrer le serveur
```

Le backend démarre sur **http://localhost:3001**

### 2. Initialiser le Frontend

```bash
cd frontend
npm install
npm run dev                 # Démarrer le dev server
```

Le frontend démarre sur **http://localhost:5173**

## Identifiants de Test

- **Admin:** admin@example.com / Admin123!
- **Consolidateur:** mansour.bocoum@example.com / Consolidateur123!
- **DG:** dg@example.com / DG123!
- **Responsable:** responsable1@example.com / User123! (etc.)

## Features Implémentées

### Backend
✅ Authentification JWT avec Refresh Token
✅ Gestion des utilisateurs et rôles
✅ CRUD des plannings hebdomadaires
✅ Flux de validation (Responsable → Consolidateur → DG)
✅ Gestion des convocations de réunions
✅ Réservation et gestion des salles
✅ Tableau de bord temps réel
✅ Service email avec templates
✅ Notifications in-app
✅ Logs d'audit

### Frontend
✅ Page de connexion sécurisée
✅ Dashboard avec indicateurs clés
✅ Module Plannings avec gestion du cycle de vie
✅ Module Réunions avec gestion des invitations
✅ Module Salles avec disponibilité
✅ Panel Administration (gestion utilisateurs/salles)
✅ Navigation par rôle
✅ Design responsive avec Tailwind CSS

## Architecture

- **Backend:** Node.js + Express + Prisma + SQLite
- **Frontend:** React + Vite + Tailwind CSS + Axios + React Router
- **Database:** SQLite (dev), PostgreSQL (production)
- **Authentication:** JWT avec HttpOnly Cookies
- **Email:** Nodemailer

## API Endpoints

### Auth
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Renouveler token
- `POST /api/auth/logout` - Déconnexion

### Plannings
- `GET /api/plannings/week/:date` - Plannings de la semaine
- `POST /api/plannings` - Créer planning
- `PUT /api/plannings/:id/submit` - Soumettre planning
- `PUT /api/plannings/:id/validate` - Valider (DG)

### Meetings
- `GET /api/meetings` - Liste des réunions
- `POST /api/meetings` - Créer réunion
- `PUT /api/meetings/:id/send` - Envoyer convocation

### Rooms
- `GET /api/rooms` - Liste des salles
- `GET /api/rooms/status` - État temps réel
- `POST /api/rooms/:id/bookings` - Réserver

### Dashboard
- `GET /api/dashboard/today` - Données d'aujourd'hui
- `GET /api/dashboard/week` - Données de la semaine

## Configuration Environnement

### Backend (.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="votre-clé-secrète"
PORT=3001
SMTP_HOST="localhost"
SMTP_PORT="1025"
```

### Frontend
API_URL est défini dans `src/api/client.js`

## Développement

### Démarrer en mode dev (deux terminaux)

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm run dev
```

### Build pour la production

```bash
# Backend
cd backend
npm run db:seed           # Optionnel: réinitialiser données

# Frontend
cd frontend
npm run build
npm run preview           # Vérifier la build
```

## Base de Données

### Modèles Prisma
- User (Admin, Consolidateur, DG, Responsable)
- Planning (avec PlanningEvent)
- Meeting (avec Invitation)
- Room (avec RoomBooking)
- Notification
- AuditLog
- RefreshToken

### Migration
```bash
# Créer/mettre à jour la base
npx prisma db push

# Réinitialiser (dev seulement)
npx prisma migrate reset

# Seed
node prisma/seed.js
```

## Troubleshooting

### Port déjà utilisé
```bash
# Backend sur 3002
NODE_ENV=development PORT=3002 npm run dev

# Frontend sur 5174
npx vite --port 5174
```

### CORS errors
Vérifier que `FRONTEND_URL` et CORS settings dans backend/server.js sont corrects

### Base de données verrouillée
```bash
rm prisma/dev.db
npx prisma db push
node prisma/seed.js
```

## Prochaines Étapes

- Ajouter les cron jobs pour les rappels automatiques
- Implémenter la pagination avancée
- Ajouter les pièces jointes aux réunions
- Intégrer un service email réel (SendGrid, etc)
- Ajouter les tests (Jest, Vitest)
- Déployer sur serveur (Vercel, Railway, etc)

## Support

Pour toute question, référez-vous au cahier_des_charges.docx à la racine du projet.
