# Gestion Planning — Documentation complète de l'application

> Document de référence fonctionnel et technique.
> Mise à jour : 21 juin 2026 — aligné sur le code source (circuit de validation à 2 paliers : coordinateur → consolidateur).

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Modèle de données](#3-modèle-de-données)
4. [Rôles et permissions](#4-rôles-et-permissions)
5. [Circuits de validation (cœur du document)](#5-circuits-de-validation)
   - 5.1 [Principes communs](#51-principes-communs)
   - 5.2 [Résolution des validateurs](#52-résolution-des-validateurs)
   - 5.3 [Circuit de validation des réunions](#53-circuit-de-validation-des-réunions)
   - 5.4 [Circuit de validation des missions](#54-circuit-de-validation-des-missions)
   - 5.5 [Circuit de validation des plannings](#55-circuit-de-validation-des-plannings)
   - 5.6 [Flux legacy (ancien circuit)](#56-flux-legacy)
   - 5.7 [La file « À valider »](#57-la-file-à-valider)
6. [Notifications](#6-notifications)
7. [Modules fonctionnels](#7-modules-fonctionnels)
8. [API REST — points d'entrée principaux](#8-api-rest)
9. [Tâches planifiées (jobs)](#9-tâches-planifiées)
10. [Glossaire des statuts](#10-glossaire-des-statuts)

---

## 1. Vue d'ensemble

**Gestion Planning** est une application de gestion d'agenda d'entreprise organisée par **directions** et **projets**. Elle permet de planifier des **réunions** (avec convocations et réservation de salle), des **missions** (déplacements/tâches affectées), et des **plannings hebdomadaires** par utilisateur, avec un **circuit de validation hiérarchique** avant publication sur le calendrier partagé.

Le principe central : un **Responsable** ne peut pas publier directement sur le calendrier de l'organisation. Ses réunions et missions passent par un **circuit de validation à deux paliers** (coordinateur du projet, puis consolidateur) avant d'être visibles de tous.

### Fonctionnalités principales

- Authentification JWT + 2FA (TOTP), réinitialisation de mot de passe, activation de compte.
- Gestion des utilisateurs, directions, projets, salles.
- Réunions : convocations email, réponses (accepté/décliné), salle/visio, fichiers (documents & comptes rendus), messagerie de réunion.
- Missions : affectations multi-utilisateurs, fichiers, localisation.
- Plannings hebdomadaires agrégeant événements, réunions et missions validés.
- Circuit de validation à 2 paliers (coordinateur → consolidateur).
- Notifications in-app + email + push (PWA / mobile).
- Calendrier consolidé, tableau de bord, annuaire (répertoire), discussions par direction/projet, messagerie directe.
- Administration : audit, sauvegardes, configuration des rôles/directions, types d'événements.

---

## 2. Architecture technique

```text
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Frontend (React + Vite)     │  HTTPS  │  Backend (Node.js + Express)  │
│  - Ant Design                │ ◄─────► │  - Prisma ORM                 │
│  - PWA / Capacitor (mobile)  │  REST   │  - JWT auth + middlewares     │
│  - Socket.io client          │  + WS   │  - Socket.io (temps réel)     │
└──────────────────────────────┘         └───────────────┬──────────────┘
                                                          │
                                                  ┌───────▼────────┐
                                                  │  PostgreSQL    │
                                                  └────────────────┘
```

### Backend (`backend/`)

| Couche | Emplacement | Rôle |
|--------|-------------|------|
| Serveur | `server.js` | Express, montage des routes, middlewares, rate limiting, Swagger |
| Routes | `src/routes/*.js` | Points d'entrée HTTP (`/api/...`) |
| Services | `src/services/*.js` | Logique métier (validation, notifications, consolidation…) |
| Config | `src/config/*.js` | Rôles, statuts de workflow, visibilité |
| Middlewares | `src/middlewares/*.js` | Auth, rôles, logging |
| Temps réel | `src/realtime/socket.js` | Émission d'événements Socket.io |
| Jobs | `src/jobs/*.js` | Tâches planifiées (rappels, digests, auto-clôture) |
| ORM | `prisma/schema.prisma` | Schéma de la base |

Montage des routes (`server.js`) — toutes derrière `authMiddleware` sauf `/api/auth` et `/api/public` :

```
/api/auth          /api/plannings     /api/meetings      /api/missions
/api/rooms         /api/users         /api/role-config   /api/dashboard
/api/validations   /api/notifications /api/calendar      /api/audit-logs
/api/2fa           /api/admin/settings /api/projects     /api/super-admin
/api/repertoire    /api/events        /api/push          /api/profile
/api/direct-messages  /api/direction-messages  /api/project-messages
```

### Frontend (`frontend/`)

| Couche | Emplacement |
|--------|-------------|
| Pages | `src/pages/*.jsx` (Login, Meetings, Missions, Planning, PendingValidations, Admin…) |
| Composants | `src/components/*.jsx` (AppLayout, NotificationBell, **ValidationWorkflowBanner**…) |
| Contextes | `src/context/` (AuthContext, ThemeModeContext) |
| Hooks | `src/hooks/` (usePendingValidations, useMobile…) |
| API client | `src/api/client.js` |
| Temps réel | `src/realtime/socket.js` |

---

## 3. Modèle de données

Entités principales (Prisma) :

### User
`id, name, email, passwordHash, role, isActive, isDeleted, directionId, projectId, jobTitle, cellUnit, phone, twoFactorEnabled…`

Un utilisateur appartient à **une direction** et éventuellement **un projet**. Il peut être désigné, sur des projets, comme **responsable**, **consolidateur** ou **coordinateur** (relations `projectsAsResponsible/Consolidator/Coordinator`).

### Project
`id, name, code, status, responsibleId, consolidatorId, coordinatorId, isActive…`

- **responsibleId** : propriétaire du planning hebdomadaire du projet.
- **consolidatorId** : valide au **2e palier** (consolidation, publication calendrier).
- **coordinatorId** : valide au **1er palier** (validation coordinateur).

### Meeting (réunion)
`id, title, agenda, organizerId, roomId, directionId, projectId, eventTypeId, meetingLink, startTime, endTime, status, attachments…`
Relations : invitations, booking (réservation salle), files, messages.

### Mission
`id, title, description, location, startTime, endTime, directionId, projectId, createdById, status…`
Relations : assignments (affectés), files.

### Planning (hebdomadaire)
`id, userId, weekStart, status, submittedAt, consolidatedAt, validatedAt, returnedAt, returnComment…`
Relations : events (PlanningEvent). Unicité `(userId, weekStart)`.

### Direction
Entité organisationnelle (ex. Direction générale, DAF, DRH). Sert au filtrage des rôles, aux discussions et à la résolution des consolidateurs « de direction ».

### Autres
`Invitation, RoomBooking, MeetingFile, MeetingMessage, MissionAssignment, MissionFile, Notification, AuditLog, EventType, RoleDirectionRule, DirectionMessage/Discussion, ProjectMessage/Discussion, DeviceToken, Backup…`

---

## 4. Rôles et permissions

### Les 4 rôles système (`backend/src/config/roles.js`)

| Rôle (en base) | En pratique |
|----------------|-------------|
| **RESPONSABLE** | Voit/gère **ses** réunions, missions et planning. Ses créations passent par le circuit de validation. |
| **CONSOLIDATEUR** | Périmètre élargi ; **consolide** (2e palier) réunions/missions/plannings ; voit toutes les missions/plannings. |
| **ADMIN** | Accès au menu Administration ; peut publier directement à n'importe quelle étape. |
| **SUPER_ADMIN** | Comme admin + actions sensibles (suppressions forcées, audit messagerie, sauvegardes). |

**Anciens rôles** (migration automatique, `LEGACY_ROLE_MAP`) :
`COORDINATEUR_PROJET → CONSOLIDATEUR`, `SECRETAIRE_GENERAL → ADMIN`, `DG → ADMIN`.

### Trois voies de droits qui s'additionnent

Un utilisateur peut acquérir des droits de validation par **trois voies cumulatives** :

1. **Rôle global** en base (`CONSOLIDATEUR`, `ADMIN`, `SUPER_ADMIN`).
2. **Profil fonctionnel** : selon sa **direction** + son **intitulé de poste** (mots-clés configurés dans Admin → Rôles & directions). Donne des capacités (`mayConsolidate`…) **sans changer le rôle en base** (`roleConfig.service.js`).
3. **Désignation sur un projet** : `consolidatorId` / `coordinatorId` sur la fiche projet → droits **pour ce projet uniquement**.

Il suffit qu'**une** voie soit vraie pour pouvoir agir. Les privilèges admin (`isPrivilegedAdmin`) court-circuitent tout le circuit.

---

## 5. Circuits de validation

> **C'est le cœur de l'application.** Cette section décrit en détail comment réunions, missions et plannings passent de l'état « brouillon » à « publié sur le calendrier ».

### 5.1 Principes communs

Le circuit **ne s'applique que lorsque le créateur/organisateur est un RESPONSABLE**. Si la réunion/mission est créée par un admin ou un non-responsable, **aucun circuit** ne s'applique : elle peut être publiée directement (`idleWorkflow()` côté `validationWorkflow.service.js`, et `requiresConsolidatorApproval()` côté visibilité).

Le circuit actuel comporte **2 paliers** :

```text
                   PALIER 1                       PALIER 2
                 Coordinateur                   Consolidateur
   ┌──────────┐  (du projet)   ┌────────────────────┐  (projet/direction/  ┌──────────────┐
   │ Brouillon│ ─────────────► │ CONSOLIDATOR_PENDING│ ──── rôle global) ─► │   Publié     │
   │  DRAFT   │   approve-      │  (attente conso.)   │      approve         │  CONFIRMED   │
   │ (SUBMITTED│   coordinator  └────────────────────┘                      │  / publié    │
   │  planning)│                                                            └──────────────┘
   └──────────┘
```

- **Palier 1 — Validation coordinateur** : le **coordinateur du projet** valide le brouillon. Statut → `CONSOLIDATOR_PENDING`. **Pas encore** de publication ni de réservation de salle.
- **Palier 2 — Consolidation** : le **consolidateur** (du projet, à défaut de la direction, à défaut rôle global) consolide. La réunion est **publiée** (statut `CONFIRMED`), les convocations sont envoyées et la salle est réservée.

**Raccourci administrateur** : un `ADMIN` / `SUPER_ADMIN` peut publier directement depuis n'importe quel état (`DRAFT`, `CONSOLIDATOR_PENDING`, ou legacy) via `approve` ou `approve-coordinator`.

Le payload de workflow renvoyé au frontend (par `attachMeetingValidationWorkflow` / `…Mission` / `buildPlanningValidationWorkflow`) contient :

```js
{
  inWorkflow, currentStep, totalSteps: 2, stepLabel, actionLabel,
  pendingValidators: [{ id, name, email, role, roleLabel, kind }],
  pendingValidatorNames, resolverScope, resolverScopeLabel, isFallback, legacy?
}
```

Il est affiché dans le bandeau `ValidationWorkflowBanner.jsx` (étape + validateurs attendus + périmètre).

### 5.2 Résolution des validateurs

La logique de **qui** valide est centralisée dans `consolidatorResolution.service.js` et `projectCoordinator.service.js`.

#### Palier 1 — coordinateur (`resolveCoordinatorValidators`)

```text
Projet a un coordinateur désigné ?
   ├─ OUI → le coordinateur du projet (scope = 'project')
   └─ NON → repli : utilisateurs au rôle global CONSOLIDATEUR (scope = 'global', isFallback)
```

#### Palier 2 — consolidateur (cascade, `resolveConsolidatorScope` / `resolveConsolidatorRecipients`)

```text
1. Projet a un consolidateur désigné ?           → consolidateur DU PROJET     (scope = 'project')
2. Sinon, direction résolue a des consolidateurs ? → consolidateurs DE LA DIRECTION (scope = 'direction')
3. Sinon                                           → utilisateurs au rôle global CONSOLIDATEUR (scope = 'global', repli)
```

La **direction** est résolue dans l'ordre : `directionId` explicite → direction du propriétaire (organizer/createdBy/userId) → direction du responsable du projet (`resolveDirectionId`).

**Candidat consolidateur de direction** (`getDirectionConsolidatorUsers`) = utilisateur de la direction qui est :
- au rôle global `CONSOLIDATEUR`, **ou**
- consolidateur désigné sur au moins un projet actif, **ou**
- doté de la capacité fonctionnelle `mayConsolidate` (profil poste + direction).

#### Qui a le droit de consolider en contexte (`canConsolidateInContext`)

```text
- Admin privilégié                         → OUI
- Projet a un consolidateur désigné        → uniquement cet utilisateur
- Sinon direction a des consolidateurs     → uniquement ceux-là
- Sinon                                     → tout utilisateur au rôle global CONSOLIDATEUR
```

### 5.3 Circuit de validation des réunions

Fichiers clés : `routes/meetings.js`, `config/meetingVisibility.js`, `services/validationPolicy.service.js`, `services/validationWorkflow.service.js`.

#### États d'une réunion

`DRAFT` → `CONSOLIDATOR_PENDING` → `CONFIRMED` (publiée) → `COMPLETED`
Hors circuit : `CANCELLED`. (`SENT` = legacy équivalent publié.)

Statuts **non publiés** sur le calendrier : `DRAFT` + tous les `PENDING_VALIDATION_STATUSES`.
Statuts **publiés** (calendrier/accueil) : `SENT`, `CONFIRMED`, `COMPLETED`.

#### Étapes détaillées

**Création** (`POST /api/meetings`)
- Toujours créée en `DRAFT`.
- Si l'organisateur est RESPONSABLE → `notifyMeetingPendingCoordinatorReview` (notifie le coordinateur, ou à défaut le rôle global). L'organisateur reçoit une confirmation « en attente de validation coordinateur (1er palier) ».

**Palier 1 — `PUT /api/meetings/:id/approve-coordinator`**
- Si admin : publie directement (raccourci).
- Sinon `canCoordinateDraftMeeting` exige : statut `DRAFT`, organisateur RESPONSABLE, projet doté d'un coordinateur, et **utilisateur = coordinateur du projet**.
- Action : statut → `CONSOLIDATOR_PENDING`, puis `notifyConsolidatorsPendingMeeting` (notifie le consolidateur cible) + `notifyOrganizerMeetingProgress(..., 'coordinated')` (« validée étape 1/2 »).
- Audit : `MEETING_COORDINATED`.

**Palier 2 — `PUT /api/meetings/:id/approve`**
- Si admin : publie directement (`DRAFT`, `CONSOLIDATOR_PENDING` ou legacy).
- Sinon, statut doit être `CONSOLIDATOR_PENDING` et `canUserConsolidateEntity(..., 'meeting')` doit être vrai (cf. cascade §5.2).
- Action : `publishMeeting()` → réservation salle (vérif. salle active + créneau libre), envoi des **convocations** à chaque invité (liens accepter/décliner signés JWT), statut → `CONFIRMED`, `sentAt` renseigné.
- Notifie l'organisateur (« consolidée et publiée »). Audit : `MEETING_APPROVED`.

**Publication directe** (`PUT /api/meetings/:id/send`)
- Pour les réunions **ne nécessitant pas** de validation (organisateur non-responsable) ou pour un admin : `canPublishMeeting` → `publishMeeting()`.
- Si la réunion d'un responsable n'est pas validée, renvoie 403 avec message explicite (« doit être validée par le coordinateur puis le consolidateur »).

#### Diagramme — réunion d'un responsable

```text
 Responsable crée la réunion
        │  POST /api/meetings  (status = DRAFT)
        ▼
 ┌─────────────┐   notif → coordinateur du projet (ou rôle global si non désigné)
 │   DRAFT     │
 └──────┬──────┘
        │  PUT /:id/approve-coordinator   (coordinateur du projet OU admin)
        ▼
 ┌──────────────────────┐  notif → consolidateur (projet → direction → rôle global)
 │ CONSOLIDATOR_PENDING │  (toujours invisible au calendrier)
 └──────────┬───────────┘
        │  PUT /:id/approve   (consolidateur autorisé OU admin)
        ▼  publishMeeting() : salle réservée + convocations envoyées
 ┌─────────────┐
 │  CONFIRMED  │  ── visible sur le calendrier ──►  COMPLETED (auto/à la main)
 └─────────────┘
```

#### Visibilité pendant le circuit (`canViewMeetingForUser` / `canViewMeeting`)

- L'organisateur et les invités voient la réunion.
- Le **coordinateur du projet** voit les `DRAFT` des responsables de son projet.
- Le **consolidateur autorisé** voit les `CONSOLIDATOR_PENDING` correspondants.
- Les admins voient tout.
- Page « Réunions » : chaque utilisateur ne voit que **ses** réunions (organisateur/invité) ; les réunions à valider passent par la page « À valider ».

#### Cycle de vie complémentaire

- **Annuler** (`PUT /:id/cancel`) : organisateur ou admin → `CANCELLED`, réservation annulée, participants notifiés.
- **Terminer** (`PUT /:id/complete`) : → `COMPLETED`, réservation libérée.
- **Rouvrir** (`PUT /:id/reopen`) : admin/responsable/créateur, depuis `COMPLETED` → `CONFIRMED` (si invités) ou `DRAFT`.
- **Auto-clôture** : job périodique ferme les réunions expirées (`meetingAutoClose.js`).

### 5.4 Circuit de validation des missions

Fichiers : `routes/missions.js`, `services/validationPolicy.service.js`, `services/projectConsolidator.service.js`.

Le circuit est **symétrique à celui des réunions** :

| Étape | Endpoint | Transition | Condition |
|-------|----------|------------|-----------|
| Création (responsable) | `POST /api/missions` | → `DRAFT` + notif coordinateur | créateur RESPONSABLE |
| Palier 1 (coordinateur) | `PUT /api/missions/:id/approve-coordinator` | `DRAFT` → `CONSOLIDATOR_PENDING` | `canCoordinateDraftMission` (coordinateur du projet) ou admin |
| Palier 2 (consolidateur) | `PUT /api/missions/:id/approve` | `CONSOLIDATOR_PENDING` → `CONFIRMED` | `canConsolidatePendingMission` (cascade) ou admin |

- Mission créée par un **non-responsable** : statut par défaut `CONFIRMED` (pas de circuit).
- Notifications : `notifyMissionPendingCoordinatorReview` (palier 1), `notifyConsolidatorsPendingMission` (palier 2).
- Les missions affectées (`assignments`) notifient les participants à la confirmation.

```text
 Responsable → POST /api/missions  →  DRAFT
        │  approve-coordinator (coordinateur projet / admin)
        ▼
   CONSOLIDATOR_PENDING
        │  approve (consolidateur autorisé / admin)
        ▼
     CONFIRMED  (mission active, affectés notifiés)
```

### 5.5 Circuit de validation des plannings

Fichiers : `services/planningValidation.service.js`, `services/projectConsolidator.service.js`, `services/projectCoordinator.service.js`, `config/planningWorkflow.js`.

#### États

`DRAFT` → `SUBMITTED` → `CONSOLIDATOR_PENDING` → validé (publié)
Legacy possible : `…_PENDING` coordinateur (cf. §5.6). Retour possible avec `returnComment`.

#### Étapes (`buildPlanningValidationWorkflow`)

| Palier | Statut entrant | Acteur | Résultat |
|--------|----------------|--------|----------|
| 1 — Validation coordinateur | `SUBMITTED` | coordinateur du projet (ou rôle global en repli) | → `CONSOLIDATOR_PENDING` |
| 2 — Consolidation | `CONSOLIDATOR_PENDING` | consolidateur (projet → direction → rôle global) | publié sur le calendrier |

Droits : `canCoordinateSubmittedPlanning` (palier 1), `canConsolidatePendingPlanning` (palier 2), `canValidatePlanningAsCoordinator` (finalisation legacy). Un coordinateur peut **retourner** un planning pour correction (`canUserReturnPlanning`, avec commentaire), ce qui le renvoie au responsable.

Le projet de validation d'un planning est **déduit** quand il n'est pas explicite, par scoring (`scorePlanningProjectCandidates`) : projet de l'utilisateur (poids 100) > projets où il est désigné (50) > projets des événements du planning (10).

> **Évolution importante** : dans la version actuelle, les **plannings agrègent des réunions et missions déjà validées**. La file « À valider » (`validationQueue.service.js`) **ne contient donc plus de plannings** — seulement réunions et missions. Le contexte de validation du planning reste calculé (`enrichPlanningForUser`) pour l'affichage du bandeau et les actions sur la fiche planning.

### 5.6 Flux legacy

L'ancien circuit (consolidation **avant** coordinateur) reste pris en charge pour les éléments encore dans ces états (`config/planningWorkflow.js`) :

```
LEGACY_PENDING_COORDINATOR_STATUSES =
  [ COORDINATOR_PENDING, CP_PENDING, SG_PENDING, DG_PENDING, IN_CONSOLIDATION ]
```

Pour ces éléments, le **coordinateur du projet** (ou admin) peut **finaliser/publier** directement :
- Réunions : `canFinalizePendingMeeting` via `approve-coordinator`.
- Missions : `canFinalizePendingMission`.
- Plannings : `canValidatePlanningAsCoordinator`.

Le workflow renvoie alors `legacy: true` (bandeau bleu « Validation finale (legacy) »). Le nouveau statut intermédiaire unique est `CONSOLIDATOR_PENDING`.

### 5.7 La file « À valider »

Endpoint : `GET /api/validations/pending` → `getPendingValidations` (`validationQueue.service.js`).
Frontend : page `PendingValidations.jsx`, hook `usePendingValidations.js`.

#### Accès au menu (`userCanAccessValidationMenuExtended`)

Le menu « À valider » est visible si l'utilisateur est : admin privilégié, **ou** rôle global CONSOLIDATEUR, **ou** candidat consolidateur de sa direction, **ou** désigné coordinateur/consolidateur sur au moins un projet actif.

#### Contenu agrégé

La file rassemble, selon le périmètre de l'utilisateur :

- **Réunions** : brouillons à valider (coordinateur), `CONSOLIDATOR_PENDING` à consolider, et éléments legacy à finaliser.
- **Missions** : idem (coordinateur draft, consolidation, legacy).
- **Plannings** : plus inclus (cf. §5.5).

Chaque item porte une **action** et un **chemin de validation** (`validationPath`) :

| `action` | Signification | Endpoint correspondant |
|----------|---------------|------------------------|
| `coordinate` | Palier 1 — valider en tant que coordinateur | `…/approve-coordinator` |
| `consolidate` | Palier 2 — consolider | `…/approve` |
| `approve` | Publication directe (admin / non-responsable) | `…/approve` |

Le scope Prisma est construit par `buildConsolidatorPendingScope` (filtrage projet/direction/rôle global), et la double appartenance (coordinateur **et** consolidateur) est dé-dupliquée par `Set` d'ids.

---

## 6. Notifications

Service : `services/notification.service.js`. Trois canaux : **in-app** (table `Notification`, badge `NotificationBell`), **email** (templates), **push** (`DeviceToken`, PWA/mobile). Temps réel via Socket.io.

### Types liés au circuit de validation

| Type | Émis quand | Destinataire |
|------|-----------|--------------|
| `MEETING_PENDING_COORDINATOR` | Réunion soumise par un responsable | Coordinateur du projet (ou rôle global) |
| `MEETING_PENDING_APPROVAL` | Réunion validée par le coordinateur | Consolidateur (projet/direction/rôle global) |
| `MEETING_COORDINATED` | Palier 1 franchi | Organisateur |
| `MEETING_PUBLISHED` | Réunion consolidée et publiée | Organisateur |
| `MEETING_CONVOCATION` | Publication | Invités (avec liens accept/décline) |
| `MISSION_PENDING_COORDINATOR` / `MISSION_PENDING_APPROVAL` | Idem missions | Coordinateur / Consolidateur |
| `PLANNING_PENDING_COORDINATOR` / `PLANNING_PENDING_CONSOLIDATION` | Idem plannings | Coordinateur / Consolidateur |
| `PROJECT_COORDINATOR_ASSIGNED` / `PROJECT_CONSOLIDATOR_ASSIGNED` | Désignation sur un projet | Utilisateur désigné |

Autres : `MEETING_SCHEDULE_UPDATED`, `MEETING_CANCELLED`, `MEETING_COMPLETED`, rappels, etc.

Si aucun consolidateur n'est joignable, l'envoi est **ignoré proprement** avec un log `CONSOLIDATOR_NOTIFY_SKIPPED` (les notifications sont best-effort et n'interrompent jamais la transaction métier).

---

## 7. Modules fonctionnels

| Module | Pages frontend | Routes backend |
|--------|----------------|----------------|
| Authentification / profil | Login, ActivateAccount, ResetPassword, Profile | `/api/auth`, `/api/2fa`, `/api/profile` |
| Réunions | Meetings, MeetingDetail, MeetingFormPage | `/api/meetings` |
| Missions | Missions, MissionDetail, MissionCreate/Edit | `/api/missions` |
| Plannings | Planning, PlanningDetail | `/api/plannings` |
| Validation | PendingValidations | `/api/validations` |
| Calendrier | Calendar, EventsUnified | `/api/calendar`, `/api/events` |
| Tableau de bord | Dashboard, Home | `/api/dashboard` |
| Projets / Directions | Projects, ProjectDetail, admin/Direction* | `/api/projects` |
| Salles | Rooms | `/api/rooms` |
| Annuaire | Repertoire | `/api/repertoire` |
| Discussions / Messagerie | Discussions | `/api/direction-messages`, `/api/project-messages`, `/api/direct-messages` |
| Administration | Admin*, AdminRoleConfigTab, AdminAuditTab | `/api/users`, `/api/role-config`, `/api/admin/settings`, `/api/audit-logs`, `/api/super-admin` |

---

## 8. API REST

### Réunions — endpoints du circuit

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/meetings` | Liste (mes réunions ; tout pour admin) |
| `GET` | `/api/meetings/:id` | Détail + payload `validation.workflow` |
| `POST` | `/api/meetings` | Créer (→ DRAFT) |
| `PUT` | `/api/meetings/:id` | Modifier |
| `PUT` | `/api/meetings/:id/approve-coordinator` | **Palier 1** (coordinateur) ou finalisation legacy / admin |
| `PUT` | `/api/meetings/:id/approve` | **Palier 2** (consolidation) ou publication admin |
| `PUT` | `/api/meetings/:id/send` | Publication directe (hors circuit) |
| `PUT` | `/api/meetings/:id/cancel` `…/complete` `…/reopen` | Cycle de vie |
| `POST` | `/api/meetings/:id/participants` / `/files` / `/messages` | Participants, fichiers, messagerie |
| `POST` | `/api/meetings/invitations/:id/respond` | Accepter/décliner |
| `DELETE` | `/api/meetings/:id` | Suppression définitive (admin) |

### Missions

`GET /api/missions`, `GET /:id`, `POST /`, `PUT /:id`, `PUT /:id/approve-coordinator`, `PUT /:id/approve`, `POST /:id/participants|files`, `DELETE /:id`.

### Validations

`GET /api/validations/pending` → file agrégée (cf. §5.7).

> Documentation Swagger disponible sur `/api/docs` (protégée). Voir aussi `API_DOCUMENTATION.md`.

---

## 9. Tâches planifiées

`backend/src/jobs/` :

| Job | Rôle |
|-----|------|
| `meetingReminders.js` | Rappels de réunions à venir |
| `meetingAutoClose.js` | Auto-clôture des réunions expirées (déclenché aussi à la volée, ≤ 1×/min) |
| `dailyDigest.js` | Digest quotidien |
| `weeklyReport.js` | Rapport hebdomadaire |

---

## 10. Glossaire des statuts

### Réunion / Mission
| Statut | Sens |
|--------|------|
| `DRAFT` | Brouillon (mission : si créateur responsable) |
| `CONSOLIDATOR_PENDING` | Validé coordinateur, en attente de consolidation (**non publié**) |
| `CONFIRMED` | Publié / actif (calendrier) |
| `COMPLETED` | Terminé |
| `CANCELLED` | Annulé |
| `SENT` | (legacy) équivalent publié |

### Planning
| Statut | Sens |
|--------|------|
| `DRAFT` | En cours de saisie |
| `SUBMITTED` | Soumis — attente coordinateur (palier 1) |
| `CONSOLIDATOR_PENDING` | Attente consolidation (palier 2) |
| validé | Publié |

### Statuts legacy (compatibilité)
`COORDINATOR_PENDING`, `CP_PENDING`, `SG_PENDING`, `DG_PENDING`, `IN_CONSOLIDATION`
→ finalisables par le coordinateur du projet ou un admin.

### Référence rapide — fonctions de décision

| Fonction (`validationPolicy.service.js`) | Question |
|------------------------------------------|----------|
| `canCoordinateDraftMeeting/Mission` | Peut valider au palier 1 ? |
| `canConsolidatePendingMeeting/Mission` | Peut consolider au palier 2 ? |
| `canApproveDraftMeeting/Mission` | Peut publier directement un brouillon (non-responsable/admin) ? |
| `canFinalizePendingMeeting/Mission` | Peut finaliser un élément legacy ? |
| `canConsolidateInContext` | A le droit de consolider dans ce contexte projet/direction/global ? |
| `canCoordinateSubmittedPlanning` / `canConsolidatePendingPlanning` | Paliers planning |

---

*Document généré à partir du code source (`backend/src/`). Pour les guides connexes : [`docs/GUIDE_ROLES_ET_DIRECTIONS.md`](docs/GUIDE_ROLES_ET_DIRECTIONS.md), [`role.md`](role.md), [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md), [`CAHIER_DES_CHARGES.md`](CAHIER_DES_CHARGES.md).*
