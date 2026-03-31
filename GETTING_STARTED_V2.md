# 🚀 GUIDE DE DÉMARRAGE - VERSION 2.0 AVEC NOTIFICATIONS, LOGGING ET CALENDRIER

## ⚡ Démarrage Rapide (2 minutes)

### Windows
```bash
start.bat
```

### Mac/Linux
```bash
chmod +x start.sh
./start.sh
```

**Devrait ouvrir 2 terminaux avec backend et frontend.**

---

## 🎯 Points Clés à Retenir

### 1. Notifications (Frontend)
- **Cloche 🔔** dans la Navbar (top-right)
- Badge rouge avec nombre non-lues
- Popup interactif avec 10 dernières notifications
- Lien vers page complète `/notifications`
- Polling auto tout es 30 secondes

### 2. Notifications (Backend)
- Email HTML + In-app simultané
- 8 types différents
- Retry automatique (3 tentatives)
- Logs dans `backend/logs/audit.log`
- API: `GET /api/notifications`

### 3. Calendrier (Frontend)
- **Menu "Calendrier"** dans Navbar
- Vue mois complète
- Couleurs par type d'événement
- Affiche réunions + plannings
- Navigation facile

### 4. Calendrier (Backend)
- 3 endpoints: `/calendar/month|week|day`
- Retourne tous les événements
- Loggé dans `audit.log`

### 5. Logging (Backend)
- **3 fichiers:** `application.log`, `audit.log`, `errors.log`
- Format JSON structure
- Rotation automatique 10MB
- Contient: IP, UserId, Action, Duration

### 6. Documentation (API)
- URL: `http://localhost:3001/api/docs`
- Swagger Interactif
- 36+ endpoints documentés
- Essayer directement

---

## 📋 Checklist d'Utilisation

### Après Démarrage
- [ ] Frontend accessible: `http://localhost:5173`
- [ ] Backend accessible: `http://localhost:3001/health`
- [ ] Swagger docs accessible: `http://localhost:3001/api/docs`
- [ ] Logs folder exists: `backend/logs/`

### Tester Notifications
- [ ] Se connecter
- [ ] Aller à Dashboard
- [ ] Créer une réunion
- [ ] Vérifier notification
- [ ] Cloque affiche badge
- [ ] `/notifications` page fonctionne

### Tester Calendrier
- [ ] Aller à Calendrier depuis menu
- [ ] Voir événements du mois
- [ ] Navigation prev/next fonctionne
- [ ] Clic sur évérëments ouvre détails

### Tester Logging
- [ ] Terminal backend accessible
- [ ] Fichiers logs créés après actions
- [ ] Actions dans `audit.log`
- [ ] Erreurs dans `errors.log`

### Tester Swagger
- [ ] Page docs ouvre
- [ ] Copier JWT depuis login
- [ ] Authoriser dans Swagger
- [ ] Essayer un endpoint

---

## 🔑 URLs Importantes

```
Frontend:        http://localhost:5173
Backend:         http://localhost:3001
Health Check:    http://localhost:3001/health
Swagger Docs:    http://localhost:3001/api/docs

Frontend Pages:
  Dashboard:     /dashboard
  Planning:      /planning
  Meetings:      /meetings
  Rooms:         /rooms
  Calendar:      /calendar      (NOUVEAU)
  Notifications: /notifications (NOUVEAU)
  Admin:         /admin

Backend APIs:
  Notifications: /api/notifications
  Calendar:      /api/calendar/month|week|day
  Auth:          /api/auth/*
  Plannings:     /api/plannings/*
```

---

## 📍 Fichiers à Connaître

### Important Backend
```
backend/logs/application.log    - Live logs
backend/logs/audit.log          - User actions
backend/logs/errors.log         - Errors
backend/src/services/notification.service.js  - Notification logic
backend/src/routes/calendar.js  - Calendar endpoints
backend/server.js               - Main server
```

### Important Frontend
```
src/pages/Calendar.jsx          - Calendar page
src/pages/Notifications.jsx     - Notifications page
src/components/NotificationBell.jsx  - Bell component
src/App.jsx                     - Routes
```

### Documentation
```
IMPROVEMENTS_SUMMARY.md         - Changes summary
NOTIFICATIONS_LOGGING_CALENDAR.md - Detailed guide
README.md                       - General docs
QUICKSTART.md                   - Quick start
```

---

## 🐛 Troubleshooting Rapide

### Notifications n'apparaissent pas
```bash
# Vérifier les logs
tail -f backend/logs/application.log

# Vérifier l'API fonctionne
curl http://localhost:3001/api/notifications
```

### Calendrier vide
```bash
# Créer une réunion d'abord
# ou vérifier les logs
tail -f backend/logs/audit.log
```

### Swagger ne charge pas
```bash
# Vérifier backend démarre
http://localhost:3001/health

# Rechager la page
```

### Logs ne se créent pas
```bash
# Vérifier permissions
ls -la backend/logs/

# Ou créer manuellement
mkdir -p backend/logs
```

---

## 💡 Points Important

1. **Notifications = Email + In-app** (simultané)
2. **Logging = Multi-fichiers** (app/audit/errors)
3. **Calendar = Tous les événements** (réunions + plannings)
4. **Swagger = Documentation interactive** (essayer endpoints)
5. **Real-time = Polling 30s** (notifications)

---

## ✅ Avant Production

- [ ] Configurer SMTP réel (Gmail, SendGrid, etc.)
- [ ] Examiner les logs d'audit
- [ ] Tester tous les types de notifications
- [ ] Vérifier la documentation Swagger
- [ ] Tester le calendrier avec données réelles
- [ ] Vérifier les permissions d'écriture logs

---

## 📞 Documentation Complète

Voir ces fichiers pour plus de détails:

1. **NOTIFICATIONS_LOGGING_CALENDAR.md** ← START HERE (400 lignes)
2. **IMPROVEMENTS_SUMMARY.md** (300 lignes)
3. **README.md** (250+ lignes)
4. **QUICKSTART.md** (150+ lignes)

---

## 🎉 C'EST PRÊT!

Toutes les fonctionnalités sont implémentées, documentées et testées.

**Démarrer maintenant:** `start.bat` ou `./start.sh`

**Bon développement!** 🚀
