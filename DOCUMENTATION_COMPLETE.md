# Gestion Planning - Documentation Complete

## 1) Objectif de l'application

`Gestion Planning` est une application web (et mobile via Capacitor) de planification collaborative qui couvre:

- la gestion des plannings hebdomadaires
- la gestion des reunions (convocation, reponse, visio, chat, fichiers)
- la gestion des missions (affectations, conflits de disponibilite, fichiers)
- l'administration (utilisateurs, roles, securite, journaux, parametres globaux)
- les notifications in-app et emails

L'application est orientee organisation interne avec controle d'acces par role.

---

## 2) Architecture technique

### Frontend

- React + Vite
- Ant Design (UI)
- React Router (navigation)
- Axios (client API)
- Zustand (notifications)
- Capacitor (Android/iOS)

### Backend

- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT (access + refresh token)
- Multer (upload fichiers)
- Nodemailer (emails)
- node-cron (jobs planifies)
- Socket.IO (temps reel natif: chat + notifications)

### Base de donnees

- schema Prisma dans `backend/prisma/schema.prisma`
- principales entites:
  - `User`, `AppSetting`, `AuditLog`, `Notification`
  - `Planning`, `PlanningEvent`
  - `Meeting`, `Invitation`, `MeetingFile`, `MeetingMessage`
  - `Mission`, `MissionAssignment`, `MissionFile`
  - `DirectMessage` (discussion privee)

---

## 3) Roles et droits

Roles principaux:

- `RESPONSABLE`
- `CONSOLIDATEUR`
- `DG`
- `ADMIN`

Regles globales:

- authentification JWT obligatoire sur routes protegees
- role `ADMIN` dispose des droits transverses avances
- certaines capacites sont controlees par parametres globaux (`AppSetting`)

Exemples de parametres admin:

- `2fa_enabled`
- `integrated_visio_enabled`
- `direct_messages_enabled`

---

## 4) Modules fonctionnels

## 4.1 Authentification et securite

- login + refresh token + logout
- activation de compte
- reset mot de passe
- 2FA TOTP (utilisateur + activation globale admin)
- historique mot de passe et regles de robustesse

Points d'entree:

- `POST /api/auth/login`
- `POST /api/auth/2fa-login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/activate`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## 4.2 Plannings

- creation/edition des evenements du planning utilisateur
- workflow de soumission, consolidation, validation, retour
- controle admin et supervision

Routes principales:

- `/api/plannings/*`

## 4.3 Reunions

Fonctionnalites:

- creation, modification, annulation
- ajout de participants
- invitations + reponse
- verification conflits (reunion/mission)
- chat de reunion (reponses, affichage bulle, WebSocket temps reel)
- fichiers de reunion (images, documents, compte-rendu)
- visio externe (meeting link)
- visio integree (Jitsi embed), activable/desactivable par admin
- envoi optimiste: bulle immediate "Envoi...", gestion echec avec "Renvoyer"

Regles importantes:

- salle libre et active requise si `roomId` defini
- au moins une salle ou un lien visio
- chat reunion: envoi autorise a organisateur/admin + invites `ACCEPTED`

Routes principales:

- `GET /api/meetings`
- `POST /api/meetings`
- `GET /api/meetings/:id`
- `PUT /api/meetings/:id`
- `PUT /api/meetings/:id/send`
- `PUT /api/meetings/:id/cancel`
- `POST /api/meetings/invitations/:id/respond`
- `POST /api/meetings/:id/participants`
- `POST /api/meetings/:id/messages`
- `POST /api/meetings/:id/files`
- `DELETE /api/meetings/:id/files/:fileId`

## 4.4 Missions

Fonctionnalites:

- creation, modification, annulation
- affectation des membres
- detection de conflits de disponibilite
- fichiers mission

Routes principales:

- `/api/missions/*`

## 4.5 Discussion privee (membre <-> membre)

Fonctionnalites:

- conversations directes entre membres
- non-lus par conversation
- recherche utilisateur
- reponse a message (`parentId`)
- suppression de message par l'auteur
- envoi de fichiers directs (Word/PDF/PNG)
- module activable/desactivable globalement par admin
- temps reel natif WebSocket (reception immediate)
- read receipts fins (niveau message)
- envoi optimiste avec etat "Envoi...", "Echec", "Renvoyer"

Routes:

- `GET /api/direct-messages/users`
- `GET /api/direct-messages/conversations`
- `GET /api/direct-messages/:userId`
- `POST /api/direct-messages/:userId`
- `POST /api/direct-messages/:userId/file`
- `DELETE /api/direct-messages/message/:messageId`

## 4.6 Notifications et emails

- notifications in-app stockees en base
- popup temps reel natif via WebSocket
- fallback polling leger en secours
- emails transactionnels (convocation, modification, rappels, etc.)

## 4.8 Temps reel (WebSocket) - details fonctionnels

Canaux Socket.IO utilises:

- `notification:new`:
  - declenchement: creation d'une notification backend
  - effet UI: popup immediate dans l'application
- `meeting:message:new`:
  - declenchement: nouveau message de chat reunion
  - effet UI: message visible immediatement pour les participants connectes
- `direct:message:new`:
  - declenchement: nouveau message prive (texte/fichier)
  - effet UI: ajout instantane dans la conversation
- `direct:messages:read`:
  - declenchement: ouverture conversation et marquage lu
  - effet UI: statut "Lu" sur les messages envoyes

Comportement UX:

- optimistic UI sur envoi message:
  - bulle immediate avec statut `Envoi...`
  - succes: remplacement par message serveur
  - echec reseau/API: bulle conservee, statut `Echec`, action `Renvoyer`
- deduplication active pour eviter les doubles bulles lorsque API + socket arrivent ensemble

## 4.7 Administration

Depuis `/admin`, l'admin peut:

- gerer utilisateurs
- consulter statistiques globales
- gerer salles
- consulter journaux d'audit
- piloter les parametres globaux (securite, visio, discussion)

---

## 5) Reponse aux invitations de reunion depuis email

Le systeme supporte des actions directes depuis email:

- bouton `Accepter`
- bouton `Refuser`

Mecanisme:

- lien securise signe JWT (token)
- endpoint public:
  - `GET /api/public/meeting-invitations/respond?token=...`
- la reponse met a jour `Invitation.status` et `respondedAt`

Variables utiles:

- `FRONTEND_URL` (liens UI)
- `BACKEND_URL` (liens d'action email publics)

---

## 6) API publique

Endpoints publics actuels:

- `GET /api/public/day-planning`
- `GET /api/public/meeting-invitations/respond`

---

## 7) Taches planifiees (cron)

- rapport hebdomadaire (lundi 08:00)
- rappels de reunion J-1 (quotidien 08:00)

Initialisation dans `backend/server.js`.

---

## 8) Fichiers et uploads

Stockage local serveur:

- `uploads/avatars`
- `uploads/meetings`
- `uploads/direct-messages`

Servis statiquement via:

- `/uploads/*`

---

## 8.1 Architecture temps reel (technique)

Backend:

- initialisation Socket.IO dans `backend/server.js` (serveur HTTP partage)
- module temps reel central: `backend/src/realtime/socket.js`
- authentification socket via JWT (`auth.token` ou header Bearer)
- rooms:
  - utilisateur: `user:<userId>`
  - reunion: `meeting:<meetingId>`
- utilitaires d'emission:
  - `emitToUser`
  - `emitToUsers`
  - `emitToMeetingRoom`

Points d'emission backend:

- notifications: `backend/src/services/notification.service.js` -> `notification:new`
- messages reunion: `backend/src/routes/meetings.js` -> `meeting:message:new`
- messages directs: `backend/src/routes/direct-messages.js` -> `direct:message:new`
- accusés de lecture directs: `backend/src/routes/direct-messages.js` -> `direct:messages:read`

Frontend:

- client socket partage: `frontend/src/realtime/socket.js`
- ecouteurs principaux:
  - `frontend/src/components/AppLayout.jsx`
  - `frontend/src/pages/MeetingDetail.jsx`
  - `frontend/src/pages/Discussions.jsx`
- fallback polling maintenu a frequence reduite (resilience)

---

## 9) Configuration environnement

Variables backend recommandees:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRY`
- `JWT_REFRESH_EXPIRY`
- `PORT`
- `FRONTEND_URL`
- `BACKEND_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE`

Frontend:

- `VITE_API_URL` (selon environnement)

---

## 10) Installation locale

## 10.1 Backend

1. Aller dans `backend`
2. Installer dependances:
   - `npm install`
3. Prisma:
   - `npm run db:generate`
   - `npm run db:push` (ou `npm run db:migrate`)
4. Lancer:
   - `npm run dev` (ou script equivalent)

## 10.2 Frontend

1. Aller dans `frontend`
2. Installer dependances:
   - `npm install`
3. Lancer:
   - `npm run dev`

---

## 11) Mobile (Capacitor)

Prerequis:

- projet frontend buildable
- Android Studio / Xcode selon cible

Scripts utilises:

- `npm run cap:sync`
- `npm run cap:android`
- `npm run cap:ios`

Se referer egalement a `frontend/MOBILE.md`.

---

## 12) Flux principaux (resume)

### Flux reunion

1. Organisateur cree reunion
2. Ajoute participants
3. Envoie convocations
4. Participants acceptent/refusent (app ou email)
5. Participants acceptes discutent dans la reunion
6. Reunion peut etre modifiee ou annulee

### Flux discussion privee

1. Ouvrir `/discussions`
2. Choisir un membre
3. Envoyer texte ou fichier
4. Repondre a un message
5. Supprimer ses propres messages si necessaire

---

## 13) Securite et bonnes pratiques

- ne jamais exposer `JWT_SECRET`
- activer HTTPS en production
- configurer `BACKEND_URL` et `FRONTEND_URL` correctement
- verifier taille et types des fichiers uploades
- suivre les journaux d'audit et logs applicatifs
- garder les dependances a jour

---

## 14) Depannage rapide

### Frontend ne se connecte pas au backend

- verifier `VITE_API_URL`
- verifier port backend
- verifier proxy Vite

### Erreurs Prisma

- serveur backend arrete pendant `db:generate`/`db:push`
- relancer commandes prisma

### Liens email non fonctionnels

- verifier `FRONTEND_URL`
- verifier `BACKEND_URL`
- verifier configuration SMTP

### Module visio integree/discussion non visible

- verifier parametres admin:
  - `integrated_visio_enabled`
  - `direct_messages_enabled`

---

## 15) Historique des evolutions recentes (resume)

- admin etendu sur plannings/missions/reunions
- integration Capacitor
- systeme rapport hebdomadaire
- statistiques admin
- 2FA globale + utilisateur
- conflits mission/reunion sur affectations
- notifications popup quasi temps reel
- fichiers + chat de reunion + reponses
- visio externe + visio integree (Jitsi) pilotable par admin
- discussion privee complete entre membres pilotable par admin
- action accepter/refuser convocation directement depuis email
- WebSocket natif pour chats et notifications
- read receipts fins (message-level) en discussion privee
- envoi optimiste avec etat d'echec + renvoi

---

## 16) Ameliorations futures conseillees

- moderation/retention des messages
- signature DKIM/SPF/DMARC pour delivrabilite email
- tests end-to-end automatises (reunions, invitations, chat)

---

## 17) Reference des principaux chemins

- Backend entrypoint: `backend/server.js`
- Schema DB: `backend/prisma/schema.prisma`
- Reunions API: `backend/src/routes/meetings.js`
- Temps reel backend: `backend/src/realtime/socket.js`
- Parametres admin: `backend/src/routes/admin-settings.js`
- Public API: `backend/src/routes/public.js`
- Notifications/email: `backend/src/services/notification.service.js`
- Reunions UI detail: `frontend/src/pages/MeetingDetail.jsx`
- Discussions UI: `frontend/src/pages/Discussions.jsx`
- Temps reel frontend: `frontend/src/realtime/socket.js`
- Admin UI: `frontend/src/pages/Admin.jsx`

