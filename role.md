# Rôles et permissions — Gestion Planning

## Rôles système (4)

| Rôle | Description |
|------|-------------|
| **RESPONSABLE** | Périmètre personnel : ses réunions, missions, planning |
| **CONSOLIDATEUR** | Consolidation des plannings soumis ; validation des réunions brouillon (rôle global ou par projet) |
| **ADMIN** | Administration applicative complète |
| **SUPER_ADMIN** | Admin + audit messagerie, suppressions forcées, documents serveur |

Les anciens rôles `COORDINATEUR_PROJET`, `SECRETAIRE_GENERAL` et `DG` sont **migrés** respectivement vers `CONSOLIDATEUR`, `ADMIN` et `ADMIN`.

---

## Configuration dynamique (Admin → Rôles & directions)

### Rôles ↔ directions

Pour chaque rôle (`RESPONSABLE`, `CONSOLIDATEUR`, `ADMIN`), l’administrateur associe une ou plusieurs **directions** dont les utilisateurs peuvent recevoir ce rôle.

- Liste vide = **aucune restriction** (comportement par défaut).
- Lors de la création / modification d’un utilisateur, le couple rôle + direction est validé.

API : `GET/PUT /api/role-config`

### Profils fonctionnels (direction + intitulé de poste)

Même principe que l’**élévation Administrateur** : l’utilisateur garde son rôle en base, mais obtient des **capacités à la connexion** si sa direction et son intitulé de poste correspondent à la configuration.

| Profil | Capacités |
|--------|-----------|
| **Administrateur** | Droits admin complets (ex. SG, DG dans la Direction générale) |
| **Peut être consolidateur** | Consolide les plannings soumis ; valide les réunions brouillon des responsables |
| **Coordinateur de projet** | Valide définitivement les plannings (étape coordinateur) ; peut retourner un planning |
| **Directeur de service** | Validation et retour des plannings en attente coordinateur (comme le coordinateur) |

Chaque profil se configure avec :

1. Une **direction** (ex. Direction générale, direction métier)
2. Des **mots-clés** dans l’intitulé de poste (séparés par des virgules)

Les capacités sont exposées au client dans `user.functionalCapabilities` après login / `GET /api/auth/me`.

---

## Validation par projet (complémentaire)

Sur chaque **fiche projet** :

| Rôle sur le projet | Rôle |
|--------------------|------|
| **Consolidateur** (`consolidatorId`) | Consolide les plannings **soumis** ; valide les **réunions en brouillon** des responsables |
| **Coordinateur** (`coordinatorId`) | **Valide définitivement** les plannings après consolidation |

Un utilisateur peut agir via le **profil fonctionnel** (config ci-dessus) **ou** via une **désignation sur le projet**, sans avoir le rôle global `CONSOLIDATEUR`.

---

## Workflow planning (simplifié)

```
Brouillon → Soumis → [Consolidateur] → Attente coordinateur → Validé
```

- **Responsable** : crée, modifie, soumet son planning.
- **Consolidateur** (rôle, profil fonctionnel ou projet) : `PUT /plannings/:id/consolidate`
- **Coordinateur** (profil fonctionnel ou projet désigné) : `PUT /plannings/:id/approve-coordinator` → `VALIDATED`
- **Directeur de service** (profil fonctionnel) : validation et retour comme le coordinateur.
- **Admin** : peut intervenir à chaque étape.

Les anciens statuts `CP_PENDING`, `SG_PENDING`, `DG_PENDING` sont traités comme **attente coordinateur**.

---

## Tableau récapitulatif

| Capacité | Responsable | Consolidateur | Admin | Super admin |
|----------|:-----------:|:-------------:|:-----:|:-----------:|
| Ses réunions / missions / planning | ✅ | — | — | — |
| Voir tout (selon périmètre) | ❌ | ✅ | ✅ | ✅ |
| Consolider planning soumis | ❌ | ✅† | ✅ | ✅ |
| Valider planning (final) | ❌ | ❌ | ✅‡ | ✅‡ |
| Retourner planning (coordinateur) | ❌ | ❌ | ✅‡ | ✅‡ |
| Publier réunion brouillon resp. | ❌ | ✅† | ✅ | ✅ |
| Menu Administration | ❌ | ❌ | ✅ | ✅ |
| Config rôles / directions | ❌ | ❌ | ✅ | ✅ |

† Rôle `CONSOLIDATEUR`, profil « peut être consolidateur », ou consolidateur **désigné sur le projet**.  
‡ Admin, profil coordinateur / directeur de service, ou coordinateur **désigné sur le projet**.

---

## Migration base de données

```bash
cd backend
npx prisma migrate deploy
# ou en dev :
npx prisma db push
npx prisma generate
```

Fichier : `prisma/migrations/20260521120000_role_config_coordinator/migration.sql`

---

## Comptes de test

Mot de passe : `Test@2026 !` — `npm run db:seed-side-accounts`

| Rôle | E-mail |
|------|--------|
| Responsable | `resp.test@adm.sn` |
| Consolidateur | `consol.test@adm.sn` |
| Admin | `admin.test@adm.sn` |
| Super admin | `superadmin@adm.sn` |
