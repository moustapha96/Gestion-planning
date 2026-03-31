# 🧪 Guide de Test

## Scénarios de Test

### Scénario 1: Workflow de Planning Complet

#### Étape 1: Connexion Responsable
- Ouvrir http://localhost:5173
- Email: `responsable1@example.com`
- Mot de passe: `User123!`
- ✅ Dashboard affiche les statistiques

#### Étape 2: Créer un Planning
- Cliquer sur "Mon Planning"
- Cliquer sur "Nouveau Planning"
- ✅ Planning créé en statut "DRAFT"

#### Étape 3: Soumettre le Planning
- Cliquer sur "Soumettre"
- ✅ Statut passe à "SUBMITTED"
- Notification affichée

#### Étape 4: Consolidation (Consolidateur)
- Se déconnecter
- Email: `mansour.bocoum@example.com`
- Mot de passe: `Consolidateur123!`
- Voir le planning soumis
- Cliquer sur "Consolider"
- ✅ Statut: "IN_CONSOLIDATION"

#### Étape 5: Validation (DG)
- Se déconnecter
- Email: `dg@example.com`
- Mot de passe: `DG123!`
- Voir le planning consolidé
- Cliquer sur "Valider"
- ✅ Statut: "VALIDATED"

### Scénario 2: Création de Réunion

#### Étape 1: Créer une Réunion
- Connexion comme Responsable
- Aller dans "Réunions"
- Cliquer sur "Nouvelle Convocation"
- Remplir les détails
- Sélectionner participants et salle
- Cliquer sur "Créer"
- ✅ Réunion en statut "DRAFT"

#### Étape 2: Envoyer Convocation
- Click sur "Envoyer"
- ✅ Statut: "SENT"
- Notification email prête (non envoyée en dev)

#### Étape 3: Répondre à Invitation
- Participants voient la réunion
- Peuvent répondre "Accepter" ou "Décliner"
- ✅ Statut de participation mis à jour

### Scénario 3: Réservation de Salle

#### Étape 1: Consulter les Salles
- Aller dans "Salles"
- Voir toutes les salles disponibles
- ✅ Affichage des équipements et capacités

#### Étape 2: Réserver une Salle
- Cliquer sur "Réserver"
- Choisir date et horaire
- ✅ Réservation confirmée

#### Étape 3: Vérifier Disponibilité
- Tableau de bord montre état actualisé
- Salle marquée comme occupée

### Scénario 4: Permissions par Rôle

#### Admin
- ✅ Peut créer/modifier utilisateurs
- ✅ Peut créer/modifier salles
- ✅ Voit le panel Admin
- ❌ Ne voit pas "Mon Planning"
- ❌ Ne peut pas soumettre planning

#### Responsable
- ✅ Voit "Mon Planning"
- ✅ Peut créer réunions
- ✅ Peut réserver salles
- ❌ Ne peut pas valider plannings
- ❌ Ne peut pas gérer utilisateurs

#### Consolidateur
- ✅ Voit tous les plannings
- ✅ Peut consolider plannings
- ✅ Peut créer réunions
- ❌ Ne peut pas valider
- ❌ Ne peut pas modifier utilisateurs

#### DG
- ✅ Voit tous les plannings
- ✅ Peut valider plannings
- ✅ Peut retourner avec commentaire
- ❌ Ne peut pas gérer utilisateurs

## Points de Contrôle Clés

### Backend
- [ ] API répond sur http://localhost:3001/health
- [ ] Base de données créée: `backend/prisma/dev.db`
- [ ] 8 utilisateurs créés
- [ ] 5 salles créées
- [ ] Middlewares JWT actifs
- [ ] CORS autorise les requêtes frontend

### Frontend
- [ ] Page de login accessible
- [ ] Dashboard charge les données
- [ ] Routeur fonctionne sans erreurs
- [ ] Navigation par rôle active/inactive les liens
- [ ] Tailwind CSS appliqué correctement
- [ ] Pas de console errors

### Base de Données
```bash
# Vérifier les tables créées
sqlite3 backend/prisma/dev.db ".tables"

# Compter les utilisateurs
sqlite3 backend/prisma/dev.db "SELECT COUNT(*) FROM User;"

# Vérifier un utilisateur
sqlite3 backend/prisma/dev.db "SELECT email, role FROM User LIMIT 1;"
```

## Logs à Vérifier

### Terminal Backend
```
Server running on port 3001
✅ Database seeded successfully!
✅ Created 8 users, 5 rooms
```

### Terminal Frontend
```
VITE v8.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

## Tests d'API avec cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# Récupérer les salles
curl -X GET http://localhost:3001/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN"

# Créer une réunion
curl -X POST http://localhost:3001/api/meetings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Meeting",
    "agenda":"Test Agenda",
    "startTime":"2026-03-15T10:00:00Z",
    "endTime":"2026-03-15T11:00:00Z",
    "participants":["user-id"]
  }'
```

## Traceback des Erreurs Courantes

### "Cannot connect to localhost:3001"
- Vérifier que le backend s'est lancé
- `npm run dev` depuis `backend/`

### "JWT invalid error"
- Token expiré (15 min)
- Nettoyer localStorage et se reconnecter
- `localStorage.clear()` dans console

### "Port 5173 already in use"
- Changer le port Vite
- `cd frontend && npm run dev -- --port 5174`

### "Database locked"
- SQLite en lecture par deux processus
- Redémarrer le backend
- Supprimer `prisma/dev.db` si nécessaire

## Performance

- [ ] Temps de login: < 1s
- [ ] Temps de chargement dashboard: < 2s
- [ ] Réponse API: < 200ms
- [ ] Pas de memory leaks
- [ ] Pas de N+1 queries

## Sécurité

- [ ] Mots de passe hachés avec bcrypt
- [ ] JWT tokens non compromis
- [ ] CORS correctement configuré
- [ ] Helmet headers présents
- [ ] Pas de données sensibles en localStorage

## Accessibilité

- [ ] Boutons cliquables au clavier (Tab)
- [ ] Labels associés aux inputs
- [ ] Contraste WCAG AA minimum
- [ ] Messages d'erreur clairs
- [ ] Navigation logique

---

**Durée totale de test recommandée: 15-20 minutes**
