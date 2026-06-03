# Guide — Rôles et directions

Ce document explique **comment fonctionnent les droits** dans Gestion Planning, sans entrer dans le détail technique. Pour les développeurs, voir aussi [`role.md`](../role.md).

---

## En résumé

Trois mécanismes se **combinent** :

| Mécanisme | Où c’est défini | Effet |
|-----------|-----------------|--------|
| **1. Rôle en base** | Fiche utilisateur (Admin → Utilisateurs) | Responsable, Consolidateur, Admin ou Super admin |
| **2. Direction de l’utilisateur** | Fiche utilisateur + **Admin → Rôles & directions** | Limite quels rôles on peut attribuer selon la direction |
| **3. Profils fonctionnels** | **Admin → Rôles & directions** (blocs direction + mots-clés) | Donne des **capacités en plus** selon l’intitulé de poste, **sans changer** le rôle en base |
| **4. Rôles sur un projet** | Fiche **Projet** (consolidateur / coordinateur) | Droits **pour ce projet seulement** |

```text
Utilisateur
    │
    ├── Rôle (Responsable, Consolidateur, Admin…)
    ├── Direction (ex. Direction générale, DAF…)
    ├── Intitulé de poste (ex. « Chargé de consolidation »)
    └── Projet rattaché (optionnel)
            │
            └── Sur le projet : consolidateur désigné, coordinateur désigné
```

---

## Les 4 rôles système

| Rôle | En pratique |
|------|-------------|
| **Responsable** | Voit et gère **ses** réunions, missions et planning. Ne voit pas celles des autres. |
| **Consolidateur** | Voit un périmètre élargi ; peut **consolider** les plannings soumis et **publier** certaines réunions en brouillon. |
| **Administrateur** | Accès au menu **Administration** (utilisateurs, projets, configuration, etc.). |
| **Super administrateur** | Comme l’admin, plus actions sensibles (audit messagerie, suppressions forcées, etc.). |

> **Anciens libellés** : Coordinateur de projet, Secrétaire général et DG ont été regroupés dans ce schéma (Consolidateur ou Admin selon les cas).

---

## Qu’est-ce qu’une direction ?

Une **direction** est une entité organisationnelle (ex. Direction générale, DAF, DRH). Chaque utilisateur peut être rattaché à **une direction** et éventuellement à **un projet**.

La direction sert à :

- organiser les utilisateurs dans l’annuaire et les discussions ;
- **restreindre** quels rôles peuvent être attribués (voir ci-dessous) ;
- faire correspondre les **profils fonctionnels** (même direction + mots-clés dans le poste).

---

## Rôles et directions (configuration Admin)

**Menu : Administration → Rôles & directions** (premier bloc de la page).

Pour chaque rôle (**Responsable**, **Consolidateur**, **Administrateur**), l’admin choisit une ou plusieurs directions autorisées.

| Configuration | Comportement |
|---------------|--------------|
| **Aucune direction sélectionnée** (liste vide) | **Toutes** les directions sont autorisées pour ce rôle. |
| **Une ou plusieurs directions choisies** | Seuls les utilisateurs de **ces** directions peuvent recevoir ce rôle à la création / modification. |

**Exemple** : si « Consolidateur » est limité à la direction « DAF », un admin ne pourra pas créer un consolidateur rattaché à la DRH — sauf s’il vide la liste (toutes directions).

Cette règle vérifie le **rôle stocké en base**, pas les profils fonctionnels.

---

## Profils fonctionnels (direction + intitulé de poste)

Toujours dans **Admin → Rôles & directions**, sous *Profils fonctionnels*.

**Principe** : si l’utilisateur appartient à la **direction configurée** et que son **intitulé de poste** contient l’un des **mots-clés** (séparés par des virgules), il obtient des droits **à la connexion**, **sans** que son rôle en base change.

| Profil | Ce que l’utilisateur peut faire en plus |
|--------|----------------------------------------|
| **Élévation Administrateur** | Droits admin (ex. SG, DG dans la Direction générale) |
| **Peut être consolidateur** | Consolider les plannings soumis ; valider les réunions brouillon des responsables |
| **Coordinateur de projet** | Valider définitivement un planning ; le retourner pour correction |
| **Directeur de service** | Même chose que le coordinateur sur l’étape « attente coordinateur » |

**Exemple** :

- Rôle en base : **Responsable**
- Direction : Direction générale
- Poste : « **Coordinateur** de programme X »
- Config : profil « Coordinateur de projet » → Direction générale + mot-clé `Coordinateur`

→ À la connexion, il peut **valider** les plannings en attente coordinateur, tout en restant « Responsable » dans la fiche utilisateur.

**Mots-clés** : la correspondance est **partielle** (insensible à la casse). Si le poste contient « coordinateur », le mot-clé `Coordinateur` suffit.

---

## Rôles sur la fiche projet (complément)

Sur chaque **projet**, on peut désigner :

| Champ | Rôle |
|-------|------|
| **Consolidateur du projet** | Consolide les plannings **soumis** des responsables de ce projet ; peut publier leurs réunions en brouillon |
| **Coordinateur du projet** | **Valide** le planning après consolidation |

Un même utilisateur peut être :

- Responsable en base ;
- **Consolidateur** uniquement sur le projet A (désignation fiche projet) ;
- ou consolidateur via le **profil fonctionnel** (poste + direction).

Les trois voies (rôle global, profil fonctionnel, désignation projet) **s’additionnent** : il suffit qu’une soit vraie pour agir.

---

## Circuit du planning (qui fait quoi ?)

```text
  Responsable          Consolidateur              Coordinateur
  (brouillon)          (soumis → consolidé)       (validation finale)
      │                       │                          │
      ▼                       ▼                          ▼
  Brouillon  ──►  Soumis  ──►  Attente coordinateur  ──►  Validé
                      ▲              │
                      │              └── Retour possible (commentaire)
                      └── Peut être : rôle Consolidateur,
                          profil « peut être consolidateur »,
                          ou consolidateur du projet
```

| Étape | Qui peut agir ? |
|-------|-----------------|
| Rédiger / soumettre | Le **responsable** concerné (ou un admin) |
| **Consolider** | Consolidateur (rôle), profil consolidateur, ou consolidateur **du projet** ; admin |
| **Valider** (final) | Coordinateur **du projet**, profil coordinateur ou directeur de service ; admin |
| **Retourner** pour correction | Coordinateur, directeur de service (profil), ou admin |

---

## Tableau simple des droits

| Action | Responsable | Consolidateur | Admin | Via profil / projet |
|--------|:-----------:|:-------------:|:-----:|:-------------------:|
| Mon planning / mes réunions | ✅ | — | — | — |
| Voir l’ensemble (missions, plannings…) | ❌ | ✅ | ✅ | Selon périmètre |
| Consolider un planning soumis | ❌ | ✅ | ✅ | Profil ou consolidateur projet |
| Valider un planning (final) | ❌ | ❌ | ✅ | Coordinateur projet ou profils coord. / directeur |
| Menu Administration | ❌ | ❌ | ✅ | Élévation admin (profil) |
| Configurer rôles & directions | ❌ | ❌ | ✅ | — |

---

## Où configurer quoi ?

| Besoin | Où aller |
|--------|----------|
| Changer le rôle d’un utilisateur | Admin → **Utilisateurs** |
| Lier un utilisateur à une direction / un projet | Admin → **Utilisateurs** (champs Direction, Projet, Intitulé de poste) |
| Limiter rôle ↔ directions | Admin → **Rôles & directions** (listes par rôle) |
| SG/DG, consolidateur par poste, coordinateur, directeur de service | Admin → **Rôles & directions** (profils fonctionnels) |
| Consolidateur / coordinateur **d’un projet** | **Projets** → modifier le projet |

---

## Cas concrets

### Cas 1 — Responsable classique

- Rôle : Responsable  
- Direction : DRH  
- Pas de profil fonctionnel, pas désigné sur un projet  

→ Il ne voit que **ses** données ; il soumet son planning ; un consolidateur (autre personne ou sur son projet) consolide ensuite.

### Cas 2 — Consolidateur global

- Rôle : **Consolidateur**  
- Direction : DAF  

→ Il peut consolider les plannings soumis dans son périmètre et traiter les réunions brouillon des responsables.

### Cas 3 — DG avec droits admin sans changer la fiche

- Rôle en base : Responsable (ou autre)  
- Direction : Direction générale  
- Poste : « **Directeur général** »  
- Config : profil **Élévation Administrateur** → Direction générale + mots-clés `DG`, `Directeur`  

→ À la connexion, menu Administration et droits admin ; le rôle affiché en base peut rester inchangé.

### Cas 4 — Coordinateur d’un seul programme

- Rôle : Responsable  
- Sur le **projet « Programme X »** : désigné **coordinateur**  

→ Il valide les plannings de ce projet à l’étape finale, sans être Administrateur ni Consolidateur global.

---

## Points à retenir

1. Le **rôle en base** reste la référence principale (Responsable, Consolidateur, Admin, Super admin).  
2. La **direction** filtre quels rôles on peut attribuer, si la configuration n’est pas vide.  
3. Les **profils fonctionnels** ajoutent des droits selon **direction + intitulé de poste**, sans modifier le rôle en base.  
4. La **fiche projet** précise qui consolide et qui valide **pour ce projet**.  
5. Un **administrateur** peut en général faire toutes les étapes ; le super admin garde les actions les plus sensibles.

---

*Dernière mise à jour : aligné sur la configuration à 4 rôles et Admin → Rôles & directions (profils fonctionnels + coordinateur / consolidateur par projet).*
