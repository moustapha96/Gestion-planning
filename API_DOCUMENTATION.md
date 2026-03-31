# 📚 Gestion Planning - Documentation Complète API

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Authentification](#authentification)
3. [Endpoints](#endpoints)
4. [Notifications](#notifications)
5. [Logging](#logging)
6. [Exemples](#exemples)

---

## Vue d'ensemble

**URL de base :** `http://localhost:3001/api`

**Documentation interactive :** `http://localhost:3001/api/docs`

### Stack technologique
- **Backend:** Node.js + Express
- **ORM:** Prisma
- **Base de données:** SQLite (dev), PostgreSQL (prod)
- **Authentification:** JWT (15 min access, 7j refresh)
- **Email:** Nodemailer
- **Logging:** Winston (fichiers JSON dans `logs/`)

---

## Authentification

Toutes les routes protégées requièrent un token JWT Bearer dans le header `Authorization`.

### Format du header
```
Authorization: Bearer <access_token>
```

### 1. Connexion (Public)

**POST** `/auth/login`

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "responsable1@example.com",
    "password": "User123!"
  }'
```

**Réponse 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "clx1abc123",
    "name": "Responsable 1",
    "email": "responsable1@example.com",
    "role": "RESPONSABLE"
  }
}
```

### 2. Renouveler le token

**POST** `/auth/refresh`

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
  }'
```

### 3. Déconnexion

**POST** `/auth/logout`

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "..."}'
```

---

## Endpoints

### 📋 Plannings

#### GET `/plannings/week/:date`
Récupérer les plannings d'une semaine

**Paramètres:**
- `date` (query string) - Date ISO (ex: 2026-03-12)

```bash
curl -X GET "http://localhost:3001/api/plannings/week/2026-03-12" \
  -H "Authorization: Bearer <token>"
```

#### GET `/plannings/:id`
Récupérer un planning spécifique

```bash
curl -X GET http://localhost:3001/api/plannings/clx1abc123 \
  -H "Authorization: Bearer <token>"
```

#### POST `/plannings`
Créer un nouveau planning (RESPONSABLE)

```bash
curl -X POST http://localhost:3001/api/plannings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "weekStart": "2026-03-12T00:00:00Z"
  }'
```

#### PUT `/plannings/:id/submit`
Soumettre un planning

```bash
curl -X PUT http://localhost:3001/api/plannings/clx1abc123/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

#### PUT `/plannings/:id/consolidate`
Consolider un planning (CONSOLIDATEUR)

```bash
curl -X PUT http://localhost:3001/api/plannings/clx1abc123/consolidate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

#### PUT `/plannings/:id/validate`
Valider un planning (DG)

```bash
curl -X PUT http://localhost:3001/api/plannings/clx1abc123/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

#### PUT `/plannings/:id/return`
Retourner un planning avec commentaire (DG)

```bash
curl -X PUT http://localhost:3001/api/plannings/clx1abc123/return \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Veuillez revoir les créneaux de réunion"
  }'
```

---

### 🤝 Réunions (Meetings)

#### GET `/meetings`
Lister les réunions de l'utilisateur

```bash
curl -X GET http://localhost:3001/api/meetings \
  -H "Authorization: Bearer <token>"
```

#### GET `/meetings/:id`
Détail d'une réunion

```bash
curl -X GET http://localhost:3001/api/meetings/clx1abc123 \
  -H "Authorization: Bearer <token>"
```

#### POST `/meetings`
Créer une convocation

```bash
curl -X POST http://localhost:3001/api/meetings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Réunion d'\''équipe",
    "agenda": "Points de projet",
    "roomId": "clx1abc123",
    "startTime": "2026-03-15T10:00:00Z",
    "endTime": "2026-03-15T11:00:00Z",
    "participants": ["clx1abc123", "clx2def456"]
  }'
```

#### PUT `/meetings/:id/send`
Envoyer la convocation

```bash
curl -X PUT http://localhost:3001/api/meetings/clx1abc123/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

#### POST `/invitations/:id/respond`
Répondre à une invitation

```bash
curl -X POST http://localhost:3001/api/invitations/clx1abc123/respond \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACCEPTED"}'
```

---

### 🏢 Salles (Rooms)

#### GET `/rooms`
Lister toutes les salles

```bash
curl -X GET http://localhost:3001/api/rooms \
  -H "Authorization: Bearer <token>"
```

#### GET `/rooms/status`
État temps réel de toutes les salles

```bash
curl -X GET http://localhost:3001/api/rooms/status \
  -H "Authorization: Bearer <token>"
```

#### GET `/rooms/:id/slots`
Créneaux libres d'une salle

```bash
curl -X GET "http://localhost:3001/api/rooms/clx1abc123/slots?date=2026-03-15" \
  -H "Authorization: Bearer <token>"
```

#### POST `/rooms`
Créer une salle (ADMIN)

```bash
curl -X POST http://localhost:3001/api/rooms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Salle A",
    "capacity": 20,
    "location": "Étage 3",
    "equipment": ["projecteur", "ecran"],
    "openFrom": "08:00",
    "openTo": "19:00"
  }'
```

#### POST `/rooms/:id/bookings`
Réserver une salle

```bash
curl -X POST http://localhost:3001/api/rooms/clx1abc123/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-15T00:00:00Z",
    "startTime": "10:00",
    "endTime": "11:00"
  }'
```

---

### 📬 Notifications

#### GET `/notifications`
Lister les notifications (avec pagination)

```bash
curl -X GET "http://localhost:3001/api/notifications?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Réponse:**
```json
{
  "notifications": [...],
  "total": 42,
  "unread": 3,
  "page": 1
}
```

#### GET `/notifications/unread/count`
Compter les non lues

```bash
curl -X GET http://localhost:3001/api/notifications/unread/count \
  -H "Authorization: Bearer <token>"
```

#### PUT `/notifications/:id/read`
Marquer comme lue

```bash
curl -X PUT http://localhost:3001/api/notifications/clx1abc123/read \
  -H "Authorization: Bearer <token>"
```

#### PUT `/notifications/read-all`
Tout marquer comme lu

```bash
curl -X PUT http://localhost:3001/api/notifications/read-all \
  -H "Authorization: Bearer <token>"
```

#### DELETE `/notifications/:id`
Supprimer une notification

```bash
curl -X DELETE http://localhost:3001/api/notifications/clx1abc123 \
  -H "Authorization: Bearer <token>"
```

---

### 📊 Dashboard

#### GET `/dashboard/today`
Données d'aujourd'hui

```bash
curl -X GET http://localhost:3001/api/dashboard/today \
  -H "Authorization: Bearer <token>"
```

**Réponse:**
```json
{
  "freeRooms": 4,
  "occupiedRooms": 1,
  "meetingsToday": 5,
  "pendingPlannings": 2,
  "rooms": [...]
}
```

#### GET `/dashboard/week`
Statistiques de la semaine

```bash
curl -X GET http://localhost:3001/api/dashboard/week \
  -H "Authorization: Bearer <token>"
```

---

### 👥 Utilisateurs (Admin)

#### GET `/users`
Lister tous les utilisateurs (ADMIN)

```bash
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer <token>"
```

#### POST `/users`
Créer un utilisateur (ADMIN)

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nouveau Responsable",
    "email": "nouveau@example.com",
    "role": "RESPONSABLE",
    "password": "TempPassword123!"
  }'
```

#### PUT `/users/:id`
Modifier un utilisateur (ADMIN)

```bash
curl -X PUT http://localhost:3001/api/users/clx1abc123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nouveau Nom"}'
```

#### PUT `/users/:id/deactivate`
Désactiver un compte (ADMIN)

```bash
curl -X PUT http://localhost:3001/api/users/clx1abc123/deactivate \
  -H "Authorization: Bearer <token>"
```

---

## Notifications

### Types de notifications

| Type | Déclencheur | Destinataire |
|------|-------------|--------------|
| PLANNING_SUBMITTED | Planning soumis | Consolidateur |
| PLANNING_VALIDATED | Planning approuvé | Responsable |
| PLANNING_RETURNED | Planning retourné | Responsable |
| PLANNING_REMINDER | Jeudi 9h (rappel) | Responsables retardataires |
| MEETING_CONVOCATION | Convocation envoyée | Participants |
| MEETING_REMINDER | J-1 à 9h | Participants confirmés |
| MEETING_CANCELLED | Réunion annulée | Participants |

### Emails

Les emails HTML sont envoyés automatiquement via Nodemailer. Configuration dans `.env`:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@gestionplanning.local
```

---

## Logging

### Fichiers de log

Les logs sont sauvegardés dans `backend/logs/` :

- **application.log** - Tous les événements
- **audit.log** - Actions utilisateur (logins, modifications)
- **errors.log** - Erreurs du système

### Niveaux de log

```
INFO      - Informations générales
WARN      - Avertissements
ERROR     - Erreurs
DEBUG     - Débogage
SUCCESS   - Succès d'opération
```

### Format JSON

```json
{
  "timestamp": "2026-03-12T22:15:30.123Z",
  "level": "INFO",
  "action": "API_REQUEST",
  "message": "GET /plannings - 200",
  "data": {
    "method": "GET",
    "route": "/plannings",
    "status": 200,
    "duration": "45ms",
    "userId": "clx1abc123"
  }
}
```

### Accéder aux logs

```bash
# Afficher les dernières lignes
tail -100 backend/logs/application.log

# Suivre en temps réel
tail -f backend/logs/audit.log

# Compter les événements
wc -l backend/logs/application.log

# Filtrer par niveau
grep '"level":"ERROR"' backend/logs/application.log

# Convertir en lisible (jq)
tail -20 backend/logs/application.log | jq '.'
```

---

## Exemples

### 1. Workflow complet: Soumission de planning

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "responsable1@example.com",
    "password": "User123!"
  }' | jq -r '.accessToken')

# 2. Créer un planning
PLANNING=$(curl -X POST http://localhost:3001/api/plannings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekStart": "2026-03-12T00:00:00Z"}' \
  | jq -r '.id')

# 3. Soumettre le planning
curl -X PUT http://localhost:3001/api/plannings/$PLANNING/submit \
  -H "Authorization: Bearer $TOKEN"

# 4. Récupérer les notifications
curl http://localhost:3001/api/notifications \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### 2. Créer et envoyer une convocation

```bash
# Créer une réunion
MEETING=$(curl -X POST http://localhost:3001/api/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Réunion d'\''équipe",
    "agenda": "Points hebdomadaires",
    "roomId": "clx1abc123",
    "startTime": "2026-03-15T10:00:00Z",
    "endTime": "2026-03-15T11:00:00Z",
    "participants": ["clx2def456", "clx3ghi789"]
  }' | jq -r '.id')

# Envoyer la convocation
curl -X PUT http://localhost:3001/api/meetings/$MEETING/send \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Réserver une salle

```bash
# Vérifier les créneaux libres
curl "http://localhost:3001/api/rooms/clx1abc123/slots?date=2026-03-15" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Réserver un créneau
curl -X POST http://localhost:3001/api/rooms/clx1abc123/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-15T00:00:00Z",
    "startTime": "10:00",
    "endTime": "11:00"
  }'
```

---

## Codes HTTP

| Code | Signification |
|------|---|
| 200 | Succès |
| 201 | Créé |
| 400 | Mauvaise requête |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Non trouvé |
| 409 | Conflit (ex: salle occupée) |
| 500 | Erreur serveur |

---

## Erreurs courantes

### "No token provided"
- Manque le header `Authorization`
- Token expiré

### "Invalid credentials"
- Email ou mot de passe incorrect
- Compte désactivé

### "Access denied"
- Rôle insuffisant
- L'utilisateur n'a pas les permissions

### "Room not available"
- La salle est occupée au créneau demandé
- Vérifier avec GET `/rooms/:id/slots`

---

## Support

- **Docs interactive:** http://localhost:3001/api/docs
- **Fichiers de config:** `backend/.env`
- **Logs:** `backend/logs/`
- **Base de données:** `backend/prisma/dev.db`

