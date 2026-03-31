# Cahier des charges — Gestion Planning

**Application de gestion des plannings hebdomadaires, réunions, missions et salles**

---

## 1. Contexte et objectifs

### 1.1 Contexte
L’application **Gestion Planning** permet à une organisation de centraliser la planification hebdomadaire des responsables, la gestion des réunions et des salles, ainsi que le suivi des missions terrain. Un workflow de validation (responsable → consolidateur → directeur général) structure la validation des plannings.

### 1.2 Objectifs
- Permettre à chaque **responsable** de créer et soumettre son planning hebdomadaire (événements, créneaux).
- Offrir une **consolidation** des plannings par un rôle dédié, puis une **validation** (ou retour pour correction) par la direction.
- Gérer les **réunions** (création, convocations, salles, participants).
- Gérer les **missions** (création, lieux, dates, intervenants).
- Exposer les **salles** et leur occupation (planning du jour, réservations).
- Fournir un **tableau de bord** et un **calendrier** (vue mois / semaine / jour).
- Notifier les utilisateurs par **notifications in-app** et **emails** (SMTP).
- Donner à l’**administrateur** une vue d’ensemble (statistiques, utilisateurs, plannings, salles, journaux) et un **rapport hebdomadaire** envoyé par email.

---

## 2. Périmètre fonctionnel

| Module              | Description principale                                      |
|---------------------|-------------------------------------------------------------|
| Authentification    | Login, mot de passe oublié, activation de compte, JWT      |
| Profil              | Infos compte, photo, changement de mot de passe             |
| Plannings           | Création, événements, soumission, consolidation, validation  |
| Réunions            | Création, envoi convocations, pièces jointes, annulation    |
| Missions            | CRUD missions, assignation d’intervenants, annulation        |
| Salles              | Liste, disponibilités, réservations, gestion (admin)        |
| Calendrier          | Vue mois / semaine / jour (réunions, missions)               |
| Notifications       | Centre de notifications, envoi admin, marquage lu           |
| Tableau de bord     | Aujourd’hui (salles, réunions, plannings en attente)        |
| Administration      | Utilisateurs, rôles, plannings, salles, statistiques, logs  |
| Rapport hebdomadaire| Cron : rapport envoyé par email chaque lundi 8h              |

---

## 3. Utilisateurs et rôles

### 3.1 Rôles

| Rôle            | Code            | Droits principaux                                                                 |
|-----------------|-----------------|-------------------------------------------------------------------------------------|
| Responsable     | `RESPONSABLE`   | Son planning, ses réunions, ses missions, salles, calendrier, notifications         |
| Consolidateur   | `CONSOLIDATEUR` | Lecture plannings soumis, action « Consolider », voir missions / événements         |
| Directeur Général | `DG`          | Plannings en consolidation : Valider / Retourner, voir missions / événements       |
| Administrateur  | `ADMIN`         | Tout : stats, utilisateurs, plannings (CRUD/soumission/consolidation/validation), salles, envoi notifications, logs, rapport hebdo |

### 3.2 Règles d’accès
- **Plannings** : le responsable est propriétaire ; consolidateur / DG / admin ont une vue lecture + actions selon le statut (consolider, valider, retourner). L’admin peut en plus créer/modifier/supprimer plannings et événements.
- **Missions** : créateur ou intervenant assigné ou admin peuvent voir/modifier/annuler.
- **Réunions** : organisateur ou invité selon les cas ; annulation par organisateur ou admin.
- **Salles** : lecture pour tous ; création/modification/suppression par admin.
- **Utilisateurs, logs, rapport** : admin uniquement.

---

## 4. Modules fonctionnels détaillés

### 4.1 Authentification et compte

- **Inscription / activation**  
  - Compte créé par un admin (pas d’inscription publique).  
  - Lien d’activation envoyé par email (token) ; l’utilisateur définit son mot de passe.

- **Connexion**  
  - Email + mot de passe.  
  - Réponse : `accessToken` (JWT) + `refreshToken` + données utilisateur (id, name, email, role, avatarUrl, etc.).  
  - Refresh token pour renouveler l’accès sans ressaisir le mot de passe.

- **Mot de passe oublié**  
  - Saisie email → envoi d’un lien de réinitialisation (email).  
  - Page dédiée (token dans l’URL) pour saisir le nouveau mot de passe.

- **Profil**  
  - Consultation / modification du nom, email (si autorisé).  
  - Upload photo de profil (avatar).  
  - Changement de mot de passe (mot de passe actuel + nouveau).

### 4.2 Plannings hebdomadaires

- **Modèle**  
  - Un planning = un **responsable** + une **semaine** (lundi à dimanche).  
  - Statuts : `DRAFT` | `SUBMITTED` | `IN_CONSOLIDATION` | `VALIDATED` | `RETURNED`.  
  - Chaque planning contient des **événements** (titre, type, début, fin, salle optionnelle, destination, description).

- **Workflow**  
  1. **Brouillon** : le responsable (ou l’admin) crée/modifie les événements.  
  2. **Soumettre** : passage en `SUBMITTED` (possible depuis brouillon ou après retour).  
  3. **Consolider** : rôle Consolidateur ou Admin → `IN_CONSOLIDATION`.  
  4. **Valider** : DG ou Admin → `VALIDATED` (notification au responsable).  
  5. **Retourner** : DG ou Admin → `RETURNED` avec commentaire ; le responsable peut corriger et resoumettre.

- **Fonctionnalités**  
  - Création d’un planning pour une semaine (si pas déjà existant).  
  - Liste par semaine (vue « Planning ») avec filtre « Mes plannings » optionnel.  
  - Détail d’un planning : événements, salle/lieu, missions du responsable qui croisent la semaine.  
  - Admin : liste tous les plannings (filtres, pagination), création pour un utilisateur, soumission/consolidation/validation/retour/suppression, gestion complète des événements sur tout planning.

- **API principale**  
  - `GET /api/plannings/week/:date` — liste des plannings de la semaine (option `?mine=1`).  
  - `GET /api/plannings/:id` — détail + `weekMissions`.  
  - `POST /api/plannings` — créer (responsable).  
  - `PUT /api/plannings/:id` — modifier (propriétaire brouillon ou admin brouillon/retourné).  
  - `PUT /api/plannings/:id/submit` — soumettre (propriétaire ou admin).  
  - `PUT /api/plannings/:id/consolidate` — consolider.  
  - `PUT /api/plannings/:id/validate` — valider.  
  - `PUT /api/plannings/:id/return` — retourner (avec commentaire).  
  - `DELETE /api/plannings/:id` — supprimer (propriétaire brouillon ou admin).  
  - `POST/PUT/DELETE /api/plannings/:id/events[/:eventId]` — CRUD événements (propriétaire en brouillon/retourné ou admin sans restriction de statut).  
  - `GET /api/plannings/admin/list` — liste admin (filtres, pagination).  
  - `POST /api/plannings/admin/create` — création par admin pour un utilisateur.

### 4.3 Réunions

- **Modèle**  
  - Titre, ordre du jour, organisateur, salle optionnelle, début, fin, statut (`DRAFT` | `SENT` | `CONFIRMED` | `CANCELLED`).  
  - Invitations (participants avec statut PENDING/ACCEPTED/DECLINED).  
  - Pièces jointes possibles.

- **Fonctionnalités**  
  - Création en brouillon, ajout de participants, choix de salle (avec vérification des créneaux libres).  
  - Envoi des convocations (emails + notifications) → statut SENT/CONFIRMED.  
  - Réponse des invités (accepter / refuser).  
  - Annulation de la réunion.  
  - Liste et détail des réunions (organisateur ou invité).

- **API principale**  
  - `GET /api/meetings` — liste.  
  - `GET /api/meetings/:id` — détail.  
  - `POST /api/meetings` — créer.  
  - `PUT /api/meetings/:id` — modifier.  
  - `PUT /api/meetings/:id/send` — envoyer convocations.  
  - `PUT /api/meetings/:id/cancel` — annuler.  
  - `POST /api/meetings/:id/participants` — ajouter participants.  
  - `POST /api/meetings/invitations/:id/respond` — accepter/refuser.  
  - `POST /api/meetings/:id/attachment` — pièce jointe.

### 4.4 Missions

- **Modèle**  
  - Titre, description, lieu, début, fin, créateur, statut (`CONFIRMED` | `CANCELLED`).  
  - Assignations (intervenants).

- **Fonctionnalités**  
  - Création, modification, annulation (créateur ou admin).  
  - Liste des missions (créées par l’utilisateur ou où il est assigné ; admin voit toutes hors annulées).  
  - Détail : lieu, dates, créateur, liste des intervenants.  
  - Sur la page détail d’un planning : bloc « Missions du responsable » (missions qui croisent la semaine du planning).

- **API principale**  
  - `GET /api/missions` — liste (filtrée par utilisateur ou tout pour admin).  
  - `GET /api/missions/:id` — détail.  
  - `POST /api/missions` — créer.  
  - `PUT /api/missions/:id` — modifier.  
  - `DELETE /api/missions/:id` — annuler.

### 4.5 Salles

- **Modèle**  
  - Nom, capacité, localisation, équipements, horaires d’ouverture (openFrom, openTo), statut (`ACTIVE` / autre).  
  - Réservations (créneaux liés aux réunions ou manuels).

- **Fonctionnalités**  
  - Liste des salles actives, détail, créneaux occupés.  
  - Vérification des salles disponibles pour un créneau (réunions).  
  - Admin : création, modification, suppression, activation/désactivation.

- **API principale**  
  - `GET /api/rooms` — liste.  
  - `GET /api/rooms/status` — statut.  
  - `GET /api/rooms/available` — salles disponibles (paramètres de créneau).  
  - `GET /api/rooms/:id/bookings` — réservations.  
  - `POST/PUT/DELETE /api/rooms` (admin), `PUT /api/rooms/:id/activate` (admin).  
  - `POST /api/rooms/:id/bookings` — réserver un créneau.

### 4.6 Calendrier

- **Vues**  
  - Mois : grille du mois avec événements (réunions, missions).  
  - Semaine : créneaux de la semaine.  
  - Jour : liste des événements du jour (réunions, missions).

- **Sources de données**  
  - `GET /api/calendar/month?month=&year=` — événements du mois.  
  - `GET /api/calendar/week?date=` — semaine.  
  - `GET /api/calendar/day?date=` — jour.

- **Navigation**  
  - Liens vers la fiche réunion ou mission au clic sur un événement.

### 4.7 Tableau de bord

- **Aujourd’hui**  
  - Salles (libres / occupées, créneaux réservés).  
  - Réunions du jour.  
  - Plannings en attente (soumis ou en consolidation).

- **Semaine**  
  - Taux d’occupation des salles sur la semaine, plannings validés pour la semaine.

- **API**  
  - `GET /api/dashboard/today` — salles, réunions du jour, plannings en attente.  
  - `GET /api/dashboard/week` — occupation semaine.

### 4.8 Notifications

- **Modèle**  
  - Utilisateur, type, titre, corps, lien optionnel, lu/non lu.

- **Fonctionnalités**  
  - Centre de notifications (liste, filtre lu/non lu, marquer comme lu, tout marquer comme lu).  
  - Envoi d’emails (templates : planning soumis/validé/retourné, convocation réunion, etc.) avec retry.  
  - Admin : envoi de notification ciblée (par rôle ou liste d’utilisateurs).

- **API**  
  - `GET /api/notifications` — liste paginée.  
  - `GET /api/notifications/unread/count` — nombre non lues.  
  - `PUT /api/notifications/:id/read` — marquer lu.  
  - `PUT /api/notifications/read-all` — tout marquer lu.  
  - `DELETE /api/notifications/:id` — supprimer.  
  - `POST /api/notifications/admin/send` — envoi par admin.

### 4.9 Administration

- **Statistiques (profil admin)**  
  - Bloc en haut de la page Administration : utilisateurs actifs, plannings (total + par statut), missions, réunions, salles.  
  - `GET /api/dashboard/admin-stats` (ADMIN).

- **Utilisateurs**  
  - Liste, création (avec envoi email de bienvenue / activation), modification (nom, email, rôle), activation/désactivation, réinitialisation mot de passe (lien par email ou nouveau mot de passe saisi par admin).

- **Plannings (admin)**  
  - Liste avec filtres (statut, utilisateur, période), création pour un responsable, soumission/consolidation/validation/retour, suppression.

- **Salles**  
  - CRUD, activation/désactivation.

- **Rôles et permissions**  
  - Consultation des rôles et permissions (affichage).

- **Journaux (logs)**  
  - Consultation des journaux d’audit (actions, entité, utilisateur, date).  
  - `GET /api/audit-logs` (ADMIN).

### 4.10 Rapport hebdomadaire (cron)

- **Déclenchement**  
  - Tous les **lundis à 8h00** (cron `0 8 * * 1`).

- **Contenu**  
  - Utilisateurs actifs (total et par rôle).  
  - Plannings (total et par statut).  
  - Missions (total, créations sur la semaine).  
  - Réunions (total et par statut).  
  - Salles actives.

- **Envoi**  
  - Email HTML envoyé à l’adresse configurée (`WEEKLY_REPORT_EMAIL`, défaut : alhusseinkhouma0@gmail.com) via le service SMTP de l’application.

---

## 5. Page d’accueil (publique)

- **URL** : `/`  
- **Contenu**  
  - Planning du jour (salles avec créneaux réservés, missions du jour) sans authentification.  
  - Bouton « Se connecter » vers `/login`.  
- **API**  
  - `GET /api/public/day-planning` — salles, réservations du jour, missions du jour.

---

## 6. Technique et sécurité

### 6.1 Stack

- **Frontend**  
  - React, Vite, React Router, Ant Design, Axios, Zustand (si utilisé).  
  - Capacitor pour builds Android / iOS (webDir `dist`, base `./`).

- **Backend**  
  - Node.js, Express, Prisma (PostgreSQL), JWT (access + refresh), nodemailer, node-cron, Helmet, CORS.

- **Base de données**  
  - PostgreSQL ; schéma Prisma (User, Room, Planning, PlanningEvent, Meeting, Invitation, RoomBooking, Notification, AuditLog, RefreshToken, Mission, MissionAssignment).

### 6.2 API

- **Base** : préfixe `/api`, authentification par Bearer (JWT) sur les routes protégées.  
- **Documentation** : Swagger UI sur `/api/docs`.  
- **Santé** : `GET /health` (status, uptime, timestamp).

### 6.3 Sécurité

- Mots de passe hashés (bcrypt).  
- JWT avec expiration ; refresh token en base.  
- Middleware d’authentification sur les routes protégées.  
- Middleware de rôle (ADMIN, CONSOLIDATEUR, DG) selon les endpoints.  
- Logs des requêtes et des actions sensibles (audit).  
- CORS et Helmet configurés ; pas de stockage de secrets côté client.

### 6.4 Variables d’environnement (principales)

- **Backend** : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`, `WEEKLY_REPORT_EMAIL`, `PORT`, `NODE_ENV`.  
- **Frontend** : `VITE_API_URL` (URL de l’API pour le build, notamment mobile).

---

## 7. Contraintes et évolutions

### 7.1 Contraintes

- Un seul planning par responsable et par semaine (contrainte métier + unicité en base).  
- Les plannings en statut validé ou en consolidation ne sont plus éditables par le responsable (sauf après retour).  
- Envoi d’emails dépendant de la configuration SMTP (en dev, serveur local type MailHog possible).  
- Application mobile : nécessite une URL d’API accessible depuis l’appareil (pas localhost).

### 7.2 Évolutions possibles

- Export des plannings (PDF/Excel).  
- Rappels automatiques (ex. rappel de soumission du planning).  
- Filtres avancés et tableaux de bord personnalisables.  
- Droits plus granulaires (permissions par entité).  
- Synchronisation calendrier (CalDAV / iCal).  
- Thématisation et multi-langue.

---

*Document généré à partir de l’analyse du projet Gestion Planning. Dernière mise à jour : mars 2026.*
