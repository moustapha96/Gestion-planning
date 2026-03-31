# 🧪 Guide de Test - Notifications, Logging et Documentation

## 🎯 Vue d'ensemble

Ce guide vous aide à tester et valider toutes les améliorations apportées au système.

---

## 1️⃣ Tester les Notifications

### Frontend - Notification Center

#### Étape 1: Afficher le center
1. Se connecter à l'application
2. Regarder la cloche 🔔 en haut à droite
3. Cliquer sur la cloche
4. UnNotificationCenter dropdown s'ouvre

#### Étape 2: Marquer comme lu
1. Cliquer sur un notification
2. Cliquer "Lire"
3. Le badge ● vire bleu → disparaît

#### Étape 3: Voir plus de notifications
1. Cliquer "Voir toutes les notifications →"
2. Page NotificationsPage s'ouvre

### Backend - Générer des Notifications

#### Via API :

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"responsable1@example.com","password":"User123!"}' \
  | jq -r '.accessToken')

# 2. Créer un planning
PLANNING=$(curl -s -X POST http://localhost:3001/api/plannings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekStart":"2026-03-12T00:00:00Z"}' \
  | jq -r '.id')

# 3. Soumettre le planning
curl -s -X PUT http://localhost:3001/api/plannings/$PLANNING/submit \
  -H "Authorization: Bearer $TOKEN"

# 4. Voir les notifications
curl -s http://localhost:3001/api/notifications \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Résultat attendu:**
- ✅ Notification "Nouveau planning soumis" créée
- ✅ Notification in-app visible
- ✅ Email HTML généré (en dev, voir logs SMTP)

### Email Testing

#### Voir les emails envoyés

Si vous utilisez un serveur SMTP de test comme `MailHog`:

1. Accéder à http://localhost:1025 (interface MailHog)
2. Voir les emails dans l'interface web
3. Vérifier le template HTML

#### Vérifier les templates

```bash
# Voir les templates dans le code
cat backend/src/services/notification.service.js | grep -A 20 "PLANNING_SUBMITTED"
```

---

## 2️⃣ Tester le Logging

### Fichiers de log

#### Vérifier les fichiers créés
```bash
# Lister les fichiers de log
ls -lah backend/logs/

# Voir les tailles
du -h backend/logs/*
```

**Attendu:**
- ✅ `application.log` - contient tous les event
- ✅ `audit.log` - logins, modifications
- ✅ `errors.log` - seulement les erreurs

### Consultation des Logs

#### Logs en temps réel
```bash
# Suivre les logs
tail -f backend/logs/application.log

# Formatter en JSON lisible
tail -f backend/logs/application.log | jq '.'
```

#### Filtrer les logs
```bash
# Voir tous les logins
grep '"action":"LOGIN"' backend/logs/audit.log | jq '.data.email'

# Voir les erreurs
grep '"level":"ERROR"' backend/logs/errors.log | jq '.message'

# Compter les API requests
grep 'API_REQUEST' backend/logs/application.log | wc -l
```

### Page Logs Admin

#### Accéder
1. Login en tant qu'admin (admin@example.com)
2. Aller dans Admin
3. Cliquer "Logs"
4. Voir les instructions d'accès aux fichiers

**Attendu:**
- ✅ Page de logs visible
- ✅ Table avec colonnes: Heure, Niveau, Action, Message
- ✅ Instructions pour `tail`, grep, jq

---

## 3️⃣ Tester Swagger/OpenAPI

### Accéder à la Documentation

1. Ouvrir http://localhost:3001/api/docs
2. Voir l'interface Swagger UI
3. En-tête personnalisé "Gestion Planning API"

### Tester un Endpoint via Swagger

#### Exemple: GET /health

1. Trouver "System" > "GET /health"
2. Cliquer "Try it out"
3. Cliquer "Execute"
4. Voir la réponse:

```json
{
  "status": "ok",
  "uptime": 1234.567,
  "timestamp": "2026-03-12T22:15:30.123Z"
}
```

#### Exemple: GET /notifications (authentifié)

1. Cliquer "Authorize" en haut
2. Entrer le token Bearer
3. Trouver "Notifications" > "GET /notifications"
4. Cliquer "Try it out"
5. Ajouter paramètres: `page=1, limit=10`
6. Cliquer "Execute"
7. Voir les notifications

### Vérifier les Schémas

1. Scroller vers le bas
2. Voir "Schemas" section
3. Explorer:
   - User (résultat utilisateur)
   - Notification (structure notification)
   - Planning (état du planning)

---

## 4️⃣ Workflow Complet de Test

### Scénario: Notification de Planning

#### 1. Admin crée un utilisateur
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' \
  | jq -r '.accessToken')

NEW_USER=$(curl -s -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "role":"RESPONSABLE",
    "password":"TestUser123!"
  }' | jq -r '.id')

echo "Utilisateur créé: $NEW_USER"
```

✅ **Vérifier les logs:**
```bash
grep "CREATE_USER" backend/logs/audit.log
```

#### 2. Utilisateur se connecte et crée un planning
```bash
USER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestUser123!"}' \
  | jq -r '.accessToken')

PLANNING=$(curl -s -X POST http://localhost:3001/api/plannings \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekStart":"2026-03-12T00:00:00Z"}' \
  | jq -r '.id')

echo "Planning créé: $PLANNING"
```

✅ **Vérifier:**
- Logs: `grep "PLANNING_CREATED" backend/logs/application.log`
- DB: `sqlite3 backend/prisma/dev.db "SELECT COUNT(*) FROM Planning"`

#### 3. Soumettre le planning
```bash
curl -s -X PUT http://localhost:3001/api/plannings/$PLANNING/submit \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
```

✅ **Vérifier:**
- Logs audit: `grep "PLANNING_SUBMITTED" backend/logs/audit.log`
- Notification créée: `curl -s http://localhost:3001/api/notifications -H "Authorization: Bearer $CONSOLIDATEUR_TOKEN" | jq '.messages[]'`
- Email: Voir dans MailHog

#### 4. Consolidateur valide
```bash
CONS_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mansour.bocoum@example.com","password":"Consolidateur123!"}' \
  | jq -r '.accessToken')

curl -s -X PUT http://localhost:3001/api/plannings/$PLANNING/consolidate \
  -H "Authorization: Bearer $CONS_TOKEN" | jq '.status'
```

✅ **Résultat:** Status = "IN_CONSOLIDATION"

#### 5. DG valide
```bash
DG_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dg@example.com","password":"DG123!"}' \
  | jq -r '.accessToken')

curl -s -X PUT http://localhost:3001/api/plannings/$PLANNING/validate \
  -H "Authorization: Bearer $DG_TOKEN" | jq '.status'
```

✅ **Résultat:** Status = "VALIDATED"

### ✅ Vérifier tout le workflow

```bash
# Voir tous les logs du planning
grep "$PLANNING" backend/logs/audit.log | jq '.action'

# Résultat attendu:
# "PLANNING_CREATED"
# "PLANNING_SUBMITTED"
# "PLANNING_CONSOLIDATED"
# "PLANNING_VALIDATED"

# Voir les notifications générées
sqlite3 backend/prisma/dev.db \
  "SELECT type, COUNT(*) FROM Notification GROUP BY type"
```

---

## 5️⃣ Checklists de Validation

### ✅ Notifications
- [ ] Cloche visible dans Navbar
- [ ] Badge rouge avec décompte
- [ ] Dropdown s'ouvre au clic
- [ ] Notifications affichées avec icônes
- [ ] "Tout marquer comme lu" fonctionne
- [ ] "Supprimer" supprime la notification
- [ ] Lien "Voir toutes" rediriger vers page
- [ ] Page Notifications charge les 10 premières
- [ ] Filtrage par type fonctionne
- [ ] Pagination fonctionne

### ✅ Logging
- [ ] Fichier `application.log` créé et contient des logs
- [ ] Fichier `audit.log` créé avec actions utilisateur
- [ ] Fichier `errors.log` créé (au moins vide)
- [ ] Logs sont en format JSON
- [ ] Chaque log a: timestamp, level, action, message
- [ ] `tail -f` montre les logs en temps réel
- [ ] Pas d'erreur lors du logging
- [ ] Rotation des fichiers > 10MB (manuelle)

### ✅ Swagger Documentation
- [ ] URL http://localhost:3001/api/docs accessible
- [ ] Page de doc charge sans erreur
- [ ] En-tête personnalisé visible
- [ ] Section "Authorize" visible
- [ ] Endpoints listés (Planning, Meeting, Rooms, etc.)
- [ ] Schémas affichés en bas
- [ ] "Try it out" fonctionne
- [ ] Exemples de réponse visibles

### ✅ API Endpoints
- [ ] GET /health retourne 200
- [ ] GET /api/notifications retourne array
- [ ] PUT /api/notifications/:id/read fonctionne
- [ ] DELETE /api/notifications/:id fonctionne
- [ ] PUT /api/notifications/read-all fonctionne
- [ ] Erreurs 401 si token manquant
- [ ] Erreurs 403 si permission insuffisante

---

## 6️⃣ Dépannage

### Les logs ne s'écrivent pas
```bash
# Vérifier les permissions
ls -la backend/logs/

# Créer le dossier si absent
mkdir -p backend/logs

# Vérifier le code du logger
cat backend/src/utils/logger.js | head -20
```

### Emails ne s'envoient pas
```bash
# Vérifier la config SMTP
cat backend/.env | grep SMTP

# Si utilisant MailHog, vérifier qu'il est lancé
lsof -i :1025

# Voir les erreurs d'email dans les logs
grep "EMAIL_FAILED" backend/logs/errors.log
```

### Swagger ne Load pas
```bash
# Vérifier le serveur
curl http://localhost:3001/health

# Vérifier les routes Swagger
grep -r "@swagger" backend/src/

# Vérifier la config
cat backend/src/config/swagger.js | head -30
```

### Notifications ne s'affichent pas
```bash
# Vérifier les notifications en DB
sqlite3 backend/prisma/dev.db \
  "SELECT COUNT(*) FROM Notification WHERE isRead = false"

# Vérifier le token
curl -s http://localhost:3001/api/notifications \
  -H "Authorization: Bearer INVALID_TOKEN"
# Doit retourner 401
```

---

## 📊 Métriques de Test

### Succès si:
✅ 90%+ des tests passent
✅ Tous les logs créés
✅ Swagger charge sans erreur
✅ Emails générés (voir template HTML)
✅ Notifications visibles au frontend
✅ Aucune erreur JS en console

### Points importants:
1. Certifient que le système est opérationnel
2. Valident la sécurité JWT
3. Vérifient le logging complet
4. Assurent la traçabilité audit

---

## 🎊 Fin des Tests

Une fois tous les tests passés:

✅ **Le système est prêt pour la production**
✅ **Les notifications fonctionnent parfaitement**
✅ **Le logging est traçable et auditable**
✅ **La documentation est complète et interactive**

---

**Bonne chance! 🚀**
