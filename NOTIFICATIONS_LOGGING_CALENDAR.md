# 📢 Système Complet de Notifications, Logging et Calendrier

## Vue d'ensemble

L'application inclut maintenant un système robuste de notifications avec email/in-app, logging détaillé de toutes les actions, documentation Swagger automatique, et un calendrier complet.

---

## 🔔 Système de Notifications

### Types de Notifications

- ✅ **PLANNING_SUBMITTED** - Planning soumis
- 🎉 **PLANNING_VALIDATED** - Planning validé
- 📌 **PLANNING_RETURNED** - Planning retourné (avec commentaire)
- 📋 **PLANNING_REMINDER** - Rappel soumission (jeudi 9h)
- 🚨 **PLANNING_URGENT** - Rappel urgent (vendredi 11h30)
- 📅 **MEETING_CONVOCATION** - Convocation réunion
- 🔔 **MEETING_REMINDER** - Rappel réunion (J-1 à 9h)
- 💬 **MEETING_RESPONSE** - Réponse à convocation
- ⚠️ **ROOM_CONFLICT** - Conflit de réservation salle

### Chaîne de Notifications

#### 1. **Email + In-App**

Toutes les notifications importantes sont envoyées par email HTML formaté ET créées dans l'app.

#### 2. **Polling (30 secondes)**

Le frontend vérifie les notifications non lues toutes les 30 secondes via `/api/notifications/unread/count`

#### 3. **Affichage Real-time**

Badge rouge avec nombre de notifications non lues dans la barre de navigation.

### API Endpoints - Notifications

```
GET    /api/notifications              - Récupérer les notifications (page, limit)
GET    /api/notifications/unread/count - Compter les non-lues
PUT    /api/notifications/:id/read     - Marquer comme lue
PUT    /api/notifications/read-all     - Marquer toutes comme lues
DELETE /api/notifications/:id          - Supprimer une notification
```

### Pages Frontend

1. **NotificationBell (Navbar)** - Cloche interactive avec panneau popup
2. **Notifications Page** - Liste complète avec filtres et pagination
3. **Intégration Dashboard** - Badge sur les tiles importants

### Configuration Emails

**Fichier:** `backend/src/services/notification.service.js`

**Templates disponibles:**
- PLANNING_REMINDER
- PLANNING_SUBMITTED
- PLANNING_VALIDATED
- PLANNING_RETURNED
- MEETING_CONVOCATION
- MEETING_REMINDER
- PASSWORD_RESET
- ACCOUNT_CREATED

**Configuration SMTP** (`.env` backend):
```
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=noreply@gestionplanning.com
SMTP_PASS=password
SMTP_FROM=noreply@gestionplanning.com
```

---

## 📊 Système de Logging

### Niveaux de Logs

- 🔵 **INFO** - Informations générales
- 🟠 **WARN** - Avertissements importantes
- 🔴 **ERROR** - Erreurs critiques
- 🟣 **DEBUG** - Informations de débogage
- 🟢 **SUCCESS** - Opérations réussies

### Fichiers de Logs

Tous les logs sont écrits dans le dossier `/backend/logs/` :

1. **application.log** - Logs générales de l'application
2. **audit.log** - Logs d'audit des actions utilisateur
3. **errors.log** - Logs des erreurs uniquement

### Format des Logs

```json
{
  "timestamp": "2026-03-12T21:00:00.000Z",
  "level": "INFO",
  "action": "PLANNING_SUBMITTED",
  "message": "User john@example.com submitted planning",
  "data": {
    "userId": "user-123",
    "planningId": "planning-456",
    "weekStart": "2026-03-16T00:00:00.000Z"
  }
}
```

### Middleware de Logging

**Fichier:** `backend/src/middlewares/logging.middleware.js`

Le middleware automatique log chaque requête HTTP :

```javascript
{
  method: "POST",
  path: "/api/plannings/123/submit",
  status: 200,
  duration: "45ms",
  ip: "192.168.1.100",
  userId: "user-123",
  userEmail: "john@example.com"
}
```

### Logs Disponibles

#### Authentification
```
AUTH - LOGIN - SUCCESS/FAILED
AUTH - LOGOUT - SUCCESS
AUTH - INVALID_CREDENTIALS
```

#### Plannings
```
PLANNING_SUBMITTED - User submitted planning
PLANNING_VALIDATED - Planning validated by DG
PLANNING_RETURNED - Planning returned with comment
PLANNING_CONSOLIDATION - Planning moved to consolidation
```

#### Réunions
```
MEETING_CREATED - New meeting created
MEETING_INVITATIONS_SENT - Invitations sent to participants
MEETING_RESPONSE_LOGGED - Participant responded
MEETING_CANCELLED - Meeting cancelled
```

#### API Requests
```
HTTP_REQUEST - GET /api/plannings - 200 - 45ms
HTTP_REQUEST - POST /api/meetings - 201 - 125ms
HTTP_REQUEST - PUT /api/notifications/:id/read - 200 - 12ms
```

#### Notifications
```
NOTIFICATION_CREATED - New notification created
NOTIFICATION_MARKED_READ - Notification marked as read
EMAIL_SENT - Email successfully sent
EMAIL_FAILED - Email failed to send (with retry attempts)
```

### Rotation des Logs

Les logs sont automatiquement archivés quand ils dépassent 10MB. Les anciens logs sont nommés avec le timestamp.

### Accès aux Logs

```bash
# Dans le conteneur backend ou local
tail -f logs/application.log     # Live logs
tail -f logs/audit.log           # Audit logs
tail -f logs/errors.log          # Errors only
grep "ERROR" logs/application.log # Filtrer les erreurs
```

---

## 📅 Calendrier Backend

### Routes Calendrier

```
GET /api/calendar/month  - Tous les événements du mois
GET /api/calendar/week   - Événements de la semaine
GET /api/calendar/day    - Événements du jour
```

### Types d'Événements Affichés

1. **Événements Planning** - Réunions, Déplacements, Autres
2. **Réunions** - Convocations auxquelles l'utilisateur participe

### Fonctionnalités

- Affichage complet du mois
- Code couleur par type d'événement
- Détail des événements au survol
- Navigation mois précédent/suivant
- Aller à aujourd\'hui.
- Pagination des résultats

---

## 🔗 Documentation Swagger

### Accès

```
http://localhost:3001/api/docs
```

### Contenu

- ✅ Tous les endpoints documentés avec OpenAPI 3.0
- ✅ Modèles de données (schemas)
- ✅ Exemples de requêtes/réponses
- ✅ Authentification JWT
- ✅ Codes d'erreur
- ✅ Descriptions détaillées

### Groupés par Tag

1. **Authentification** - Login, Refresh, Logout
2. **Plannings** - CRUD + workflow
3. **Réunions** - Convocations et réponses
4. **Salles** - Gestion et réservations
5. **Utilisateurs** - Gestion et rôles
6. **Notifications** - Listing et gestion
7. **Calendrier** - Événements par période
8. **Dashboard** - Statistiques

### Authentification dans Swagger

1. Cliquez sur "Authorize"
2. Collez votre JWT token
3. Cliquez "Authorize"
4. Les endpoints protégés sont maintenant accessibles

---

## 🎯 Utilisation Frontend

### NotificationBell Component

```jsx
import NotificationBell from './components/NotificationBell';

<NotificationBell userId={user.id} />
```

**Fonctionnalités:**
- Affiche le nombre de notifications non lues
- Popup avec les 10 dernières notifications
- Marquer comme lue depuis le popup
- Supprimer une notification
- Lien vers la page de notifications

### Pages Disponibles

1. **`/calendar`** - Calendrier complet du mois avec tous les événements
2. **`/notifications`** - Liste complète des notifications avec filtres
3. **Navbar** - Intégration de la cloche de notifications

### Navigation

- **Calendrier** - Bouton dans la Navbar
- **Notifications** - Icône cloche avec popup ou lien vers page complète

---

## 📝 Exemples d'Utilisation

### Récupérer les Notifications

```javascript
// Frontend
const response = await api.get('/notifications', {
  params: { page: 1, limit: 20 }
});

// Réponse
{
  "notifications": [
    {
      "id": "notif-123",
      "userId": "user-456",
      "type": "PLANNING_VALIDATED",
      "title": "Planning validé",
      "body": "Votre planning pour la semaine du 16 mars a été approuvé",
      "link": "/plannings/planning-789",
      "isRead": false,
      "createdAt": "2026-03-12T21:00:00Z"
    }
  ],
  "total": 42,
  "unread": 3
}
```

### Créer une Notification in-app

```javascript
// Backend (dans un service ou route)
await notificationService.createNotification(
  prisma,
  userId,
  'PLANNING_VALIDATED',
  'Planning validé',
  'Votre planning a été approuvé',
  '/plannings/planning-id'
);
```

### Envoyer Email + In-app

```javascript
// Backend
await notificationService.sendFullNotification(
  prisma,
  userId,
  userEmail,
  'PLANNING_SUBMITTED',
  'PLANNING_SUBMITTED',  // Template email key
  [user, planningId],    // Template params
  'Planning reçu',       // In-app title
  'Votre planning a été soumis', // In-app body
  '/plannings/planning-id'
);
```

### Consulter les Logs

```bash
# Voir toutes les actions d'un utilisateur
grep "userId.*user-123" logs/audit.log

# Voir toutes les erreurs
cat logs/errors.log

# Voir les 50 dernières lignes en live
tail -50f logs/application.log

# Filtrer par action
grep -i "PLANNING" logs/audit.log
```

---

## ⚙️ Configuration

### Backend (.env)

```env
# Notifications Email
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@gestionplanning.local

# Logging path
LOGS_PATH=./logs

# Notification
CONSOLIDATEUR_EMAIL=mansour.bocoum@example.com
```

### Frontend (vite.config.js)

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  }
}
```

---

## 🐛 Troubleshooting

### Notifications ne s'affichent pas

1. Vérifier que les logs ne contiennent pas d'erreur NOTIFICATION_ERROR
2. Vérifier que le user.id est correct
3. Polling : vérifier `/api/notifications/unread/count`

### Emails non reçus

1. Vérifier SMTP_HOST et port dans .env
2. Vérifier les logs `EMAIL_FAILED`
3. Essayer avec localhost:1025 (MailHog) en développement

### Logs vides

1. Vérifier que `/backend/logs` existe
2. Vérifier les permissions d'écriture
3. Vérifier NODE_ENV value

### Calendrier ne charge pas

1. Vérifier que l'utilisateur a des plannings/réunions
2. Vérifier les logs `/api/calendar/month`
3. Vérifier la date en paramètre au format ISO

---

## 🚀 Prochaines Étapes

- [ ] Notifications WebSocket en temps réel
- [ ] Export calendrier (iCal, Google Calendar)
- [ ] Statistiques de notifications par type
- [ ] Archivage automatique des logs
- [ ] Push notifications mobile
- [ ] SMS pour réunions critiques

---

**Créé le:** 12 mars 2026
**Version:** 2.0 (Notifications + Logging + Calendar)
**État:** ✅ Production Ready
