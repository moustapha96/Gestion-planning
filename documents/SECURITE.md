# Sécurité — Gestion Planning

> Audit complet : état actuel, lacunes identifiées et guide d'implémentation  
> Dernière mise à jour : 2026-04-14

---

## Table des matières

1. [Ce qui est déjà en place](#1-ce-qui-est-déjà-en-place)
2. [Ce qui reste à faire](#2-ce-qui-reste-à-faire)
3. [Guide d'implémentation détaillé](#3-guide-dimplémentation-détaillé)
4. [Tableau de bord des priorités](#4-tableau-de-bord-des-priorités)

---

## 1. Ce qui est déjà en place

### Authentification & JWT ✅

| Mesure | Détail |
|--------|--------|
| JWT avec expiration courte | Access token 15 min, Refresh token 7 jours |
| Rotation des refresh tokens | Stockés en BDD, révocables individuellement |
| 2FA TOTP | Via `speakeasy`, token temporaire valide 5 min |
| Reset mot de passe sécurisé | Token lié au hash du MDP — auto-invalidé après changement |
| Activation de compte | Via lien email avec token à usage unique |
| Révocation à la déconnexion | Refresh tokens invalidés en BDD |

---

### Sécurité des mots de passe ✅

| Mesure | Détail |
|--------|--------|
| Hachage bcrypt | 12 rounds (coût élevé, résistant aux GPU) |
| Complexité obligatoire | Min. 8 car., majuscule, chiffre, caractère spécial |
| Historique des mots de passe | Réutilisation des 3 derniers MDP interdite |
| Révocation des sessions | Tous les refresh tokens révoqués après changement MDP |

---

### Rate Limiting ✅ (partiel)

| Endpoint | Limite |
|----------|--------|
| `POST /api/auth/login` | 5 tentatives / 15 min par IP+email |
| Global API | 200 req / 60 sec par IP |

---

### Contrôle d'accès (RBAC) ✅

- Rôles : `RESPONSABLE`, `CONSOLIDATEUR`, `DG`, `ADMIN`, `SUPER_ADMIN`
- Middleware `auth.middleware.js` + `role.middleware.js` sur toutes les routes protégées
- Vérifications fonctionnelles : `canEditMeeting`, `isParticipant`, etc.
- Endpoints super-admin séparés (backups, modération)

---

### En-têtes de sécurité ✅ (partiel)

- **Helmet.js** activé (mais CSP désactivé pour compatibilité Swagger)
- **CORS** configuré avec `FRONTEND_URL` et `credentials: true`
- Socket.IO CORS correctement restreint

---

### Validation des données ✅ (partiel)

- Schémas **Zod** sur les routes `auth` et `profile`
- Upload fichiers : limite de taille (5 Mo avatars, 15 Mo messages), whitelist d'extensions
- Pagination : `parseInt` + `Math.max/min` sur les query params

---

### Protection BDD ✅

- **Prisma ORM** : toutes les requêtes sont paramétrées — protection native contre l'injection SQL
- Aucune requête SQL brute détectée
- Soft delete (`isDeleted`) pour les enregistrements sensibles

---

### Audit & Logs ✅

- 3 loggers : `application.log`, `audit.log`, `errors.log`
- Modèle `AuditLog` en BDD : action, entité, IP, utilisateur, timestamp
- Export CSV des logs d'audit
- Logging des requêtes HTTP (méthode, path, status, durée, user)

---

### Sécurité des fichiers uploadés ✅

- `multer` avec `diskStorage` (jamais en mémoire)
- Nommage des fichiers : `userId + extension` (pas de nom original conservé)
- Dossiers dédiés par type (`/uploads/avatars/`, etc.)

---

## 2. Ce qui reste à faire

### 🔴 CRITIQUE

#### C1 — Credentials exposés dans `.env`
**Risque** : Si le `.env` est committé dans git, SMTP, JWT Secret et DB sont compromis.

**Problème** :
```
SMTP_PASS=nuaaylchrztkwmoe         # mot de passe réel exposé
JWT_SECRET=your-super-secret...   # valeur par défaut non changée
DATABASE_URL=postgresql://user:password@...  # credentials par défaut
```

---

#### C2 — Aucune protection CSRF
**Risque** : Un site malveillant peut forcer un utilisateur connecté à effectuer des actions (suppression, modification) à son insu.

Toutes les routes `POST`, `PUT`, `DELETE` sont vulnérables.

---

### 🟠 HAUTE PRIORITÉ

#### H1 — Validation des entrées incomplète
Seules les routes `auth` et `profile` utilisent Zod. Les routes `meetings`, `plannings`, `notifications`, `rooms` n'ont **aucune validation** sur les `body` et `query`.

#### H2 — XSS dans les templates HTML (`public.js`)
Des variables sont interpolées directement dans du HTML sans échappement :
```js
// Vulnérable
res.send(`<html><body>${title}</body></html>`)
```

#### H3 — Stack traces exposées dans les réponses
L'erreur globale inclut partiellement la stack :
```js
stack: err.stack?.split('\n').slice(0, 3).join(' ')  // NE PAS exposer en prod
```

#### H4 — Aucune limite sur la taille des requêtes JSON
`express.json()` est appelé sans `limit`, permettant des payloads arbitrairement grands (DoS possible).

#### H5 — Rate limiting insuffisant
Endpoints sans protection :
- `POST /api/auth/forgot-password`
- `POST /api/auth/activate`
- `POST /api/auth/2fa-login`
- Routes d'upload

#### H6 — 2FA sans limite de tentatives
Le TOTP à 6 chiffres (~1 million de combinaisons) peut être bruteforcé si aucune limite n'est appliquée sur `POST /api/auth/2fa-login`.

#### H7 — Swagger accessible sans authentification en production
L'URL `/api/docs` expose toute la structure de l'API (endpoints, schémas, paramètres).

#### H8 — Validation du type de fichier par extension uniquement
Un attaquant peut renommer un `.exe` en `.jpg`. Le contenu réel du fichier n'est jamais vérifié.

---

### 🟡 PRIORITÉ MOYENNE

#### M1 — CSP (Content Security Policy) désactivée globalement
Désactivée pour Swagger, mais devrait être activée pour toutes les autres routes.

#### M2 — HSTS non configuré
Aucune header `Strict-Transport-Security` — pas de forçage HTTPS.

#### M3 — Cookies sans flags `Secure`, `HttpOnly`, `SameSite`
Les tokens JWT sont dans `localStorage` (vulnérable au XSS). Idéalement : cookies `HttpOnly`.

#### M4 — Path traversal potentiel (`super-admin.js`)
```js
path.join(__dirname, '../..', row.relativePath)  // relativePath non validé
```

#### M5 — Refresh token expiration longue (7 jours)
Pour une app sensible, 7 jours est trop long. Préférer 1-2 jours max.

#### M6 — Logs sans rotation ni alerte
Logs locaux sans rotation automatique, sans monitoring d'événements suspects.

---

### 🔵 BASSE PRIORITÉ

#### L1 — Pas de scan automatique des dépendances vulnérables
Aucun `npm audit` dans le pipeline CI/CD.

#### L2 — Pas de versionnage d'API (`/api/v1/`)
Difficile de faire évoluer l'API sans casser les clients existants.

---

## 3. Guide d'implémentation détaillé

### [C1] Sécuriser les credentials

**1. Vérifier que `.env` est dans `.gitignore`**
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

**2. Créer un `.env.example` avec des placeholders**
```env
# .env.example — NE JAMAIS mettre de vraies valeurs ici
JWT_SECRET=CHANGE_ME_32_CHARS_MINIMUM_RANDOM_STRING
SMTP_USER=votre@email.com
SMTP_PASS=CHANGE_ME
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/gestion_planning
```

**3. Générer un JWT_SECRET robuste**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**4. Valider les variables d'environnement au démarrage** (`backend/src/config/env.js`)
```js
const required = ['JWT_SECRET', 'DATABASE_URL', 'SMTP_USER', 'SMTP_PASS'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: Variable d'environnement manquante: ${key}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET trop court (min 32 caractères)');
  process.exit(1);
}
```

---

### [C2] Protection CSRF

Pour une API REST avec JWT dans les headers (pas de cookies), le CSRF est moins critique. Mais si vous migrez vers des cookies `HttpOnly`, il devient **obligatoire**.

**Option A — Approche recommandée : tokens dans Authorization header**
- Le CSRF n'est pas possible si le token JWT est envoyé via `Authorization: Bearer <token>` (seul JS peut lire/envoyer ce header, pas un formulaire externe).
- **Action** : S'assurer que le frontend envoie toujours le token dans le header, jamais via cookie automatique.

**Option B — Si passage aux cookies HttpOnly**

```bash
npm install csrf-csrf
```

```js
// backend/src/middlewares/csrf.middleware.js
const { doubleCsrf } = require('csrf-csrf');

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: { sameSite: 'strict', secure: process.env.NODE_ENV === 'production' },
});

module.exports = { generateToken, doubleCsrfProtection };
```

```js
// server.js — appliquer sur les routes qui modifient des données
app.use('/api', doubleCsrfProtection);
// GET /api/auth/csrf-token → retourne le token au frontend
app.get('/api/auth/csrf-token', (req, res) => {
  res.json({ csrfToken: generateToken(req, res) });
});
```

---

### [H1] Validation des entrées avec Zod — toutes les routes

**Pattern à appliquer sur chaque route** :

```js
// backend/src/validators/meeting.validator.js
const { z } = require('zod');

const createMeetingSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  roomId: z.string().cuid().optional(),
  participants: z.array(z.string().cuid()).min(1).max(50),
  type: z.enum(['PRESENTIEL', 'VISIO', 'HYBRIDE']),
});

// Middleware réutilisable
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Données invalides',
      details: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data; // données nettoyées
  next();
};

module.exports = { createMeetingSchema, validate };
```

```js
// backend/src/routes/meetings.js
const { createMeetingSchema, validate } = require('../validators/meeting.validator');

router.post('/', authMiddleware, validate(createMeetingSchema), async (req, res) => {
  // req.body est maintenant validé et nettoyé
});
```

---

### [H2] Échappement HTML dans `public.js`

```js
// Fonction d'échappement simple
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Usage dans les templates
res.send(`
  <html>
    <head><title>${escapeHtml(title)}</title></head>
    <body>${escapeHtml(body)}</body>
  </html>
`);
```

---

### [H3] Masquer les stack traces en production

```js
// backend/src/middlewares/error.middleware.js
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Toujours logger le détail complet côté serveur
  errorLogger.error({ err, path: req.path, method: req.method });

  // Ne jamais exposer la stack en production
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Une erreur interne est survenue',
    ...(isDev && { stack: err.stack }),
  });
};
```

---

### [H4] Limiter la taille des requêtes JSON

```js
// backend/server.js — remplacer la ligne existante
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

---

### [H5] Rate limiting sur les endpoints sensibles

```js
// backend/src/middlewares/rateLimit.middleware.js
const rateLimit = require('express-rate-limit');

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5,
  message: { error: 'Trop de tentatives. Réessayez dans 1 heure.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives d\'activation.' },
});

const twoFaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 tentatives 2FA par 15 min
  message: { error: 'Trop de tentatives 2FA. Réessayez plus tard.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Trop d\'uploads. Attendez 1 minute.' },
});

module.exports = { forgotPasswordLimiter, activationLimiter, twoFaLimiter, uploadLimiter };
```

```js
// backend/src/routes/auth.js
const { forgotPasswordLimiter, activationLimiter, twoFaLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/forgot-password', forgotPasswordLimiter, ...);
router.post('/activate', activationLimiter, ...);
router.post('/2fa-login', twoFaLimiter, ...);
```

---

### [H7] Protéger Swagger en production

```js
// backend/src/middlewares/swaggerAuth.middleware.js
const swaggerAuth = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const auth = req.headers.authorization;
    const expected = `Basic ${Buffer.from(
      `${process.env.SWAGGER_USER}:${process.env.SWAGGER_PASS}`
    ).toString('base64')}`;
    if (auth !== expected) {
      res.set('WWW-Authenticate', 'Basic realm="API Docs"');
      return res.status(401).send('Accès non autorisé');
    }
  }
  next();
};

// server.js
app.use('/api/docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

Ajouter dans `.env` :
```env
SWAGGER_USER=admin
SWAGGER_PASS=CHANGE_ME_STRONG_PASSWORD
```

---

### [H8] Validation du contenu réel des fichiers uploadés

```bash
npm install file-type
```

```js
// backend/src/middlewares/fileValidation.middleware.js
const { fileTypeFromBuffer } = require('file-type');
const fs = require('fs').promises;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const validateFileContent = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const buffer = await fs.readFile(req.file.path);
    const type = await fileTypeFromBuffer(buffer);

    if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
      await fs.unlink(req.file.path); // supprimer le fichier invalide
      return res.status(400).json({ error: 'Type de fichier non autorisé' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Erreur de validation du fichier' });
  }
};

module.exports = { validateFileContent };
```

---

### [M1] CSP ciblée (Swagger exclu)

```js
// backend/server.js
const helmet = require('helmet');

// CSP activée partout SAUF /api/docs
app.use((req, res, next) => {
  if (req.path.startsWith('/api/docs')) return next();
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  })(req, res, next);
});

// Helmet sans CSP pour /api/docs
app.use(helmet({ contentSecurityPolicy: false }));
```

---

### [M2] HSTS

```js
// backend/server.js
app.use(helmet.hsts({
  maxAge: 31536000, // 1 an
  includeSubDomains: true,
  preload: true,
}));
```

---

### [M4] Corriger le path traversal

```js
// backend/src/routes/super-admin.js
const path = require('path');

const safePath = (relativePath) => {
  const resolved = path.resolve(path.join(__dirname, '../..', relativePath));
  const base = path.resolve(path.join(__dirname, '../..'));
  if (!resolved.startsWith(base)) {
    throw new Error('Chemin non autorisé');
  }
  return resolved;
};

// Usage
const filePath = safePath(row.relativePath);
```

---

### [L1] Audit automatique des dépendances

**Script npm** (`package.json`) :
```json
{
  "scripts": {
    "audit:check": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix"
  }
}
```

**Lancer régulièrement** :
```bash
# Backend
cd backend && npm audit --audit-level=moderate

# Frontend
cd frontend && npm audit --audit-level=moderate
```

**Intégrer dans un hook pre-push** (`.git/hooks/pre-push`) :
```bash
#!/bin/bash
cd backend && npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "ERREUR: Vulnérabilités critiques détectées dans backend"
  exit 1
fi
```

---

## 4. Tableau de bord des priorités

| # | Problème | Sévérité | Effort | Action |
|---|----------|----------|--------|--------|
| C1 | Credentials dans `.env` exposés | 🔴 CRITIQUE | Faible | Rotation immédiate + `.gitignore` |
| C2 | Pas de protection CSRF | 🔴 CRITIQUE | Moyen | Vérifier usage des headers JWT |
| H1 | Validation Zod manquante (meetings, plannings…) | 🟠 HAUTE | Élevé | Créer validators/ par route |
| H2 | XSS dans templates HTML (`public.js`) | 🟠 HAUTE | Faible | Ajouter `escapeHtml()` |
| H3 | Stack trace exposée en production | 🟠 HAUTE | Faible | Middleware erreur conditionnel |
| H4 | Pas de limite sur les requêtes JSON | 🟠 HAUTE | Faible | `express.json({ limit: '1mb' })` |
| H5 | Rate limiting manquant (forgot-pwd, activate) | 🟠 HAUTE | Faible | Ajouter limiters sur endpoints |
| H6 | 2FA sans limite de tentatives | 🟠 HAUTE | Faible | Rate limiter sur `/2fa-login` |
| H7 | Swagger accessible en production | 🟠 HAUTE | Faible | Basic auth ou désactiver en prod |
| H8 | Type de fichier vérifié par extension seulement | 🟠 HAUTE | Moyen | `file-type` package |
| M1 | CSP désactivée globalement | 🟡 MOYENNE | Moyen | CSP conditionnelle hors `/api/docs` |
| M2 | HSTS absent | 🟡 MOYENNE | Faible | `helmet.hsts()` |
| M3 | Tokens JWT dans `localStorage` | 🟡 MOYENNE | Élevé | Migration vers cookies `HttpOnly` |
| M4 | Path traversal potentiel | 🟡 MOYENNE | Faible | Validation `safePath()` |
| M5 | Refresh token trop long (7 jours) | 🟡 MOYENNE | Faible | Réduire à 1-2 jours |
| M6 | Logs sans rotation ni alerte | 🟡 MOYENNE | Moyen | winston-daily-rotate-file |
| L1 | Pas de scan des dépendances | 🔵 BASSE | Faible | `npm audit` en CI/CD |
| L2 | Pas de versionnage d'API | 🔵 BASSE | Élevé | Préfixe `/api/v1/` |

---

> **Règle d'or** : toujours valider les données à l'entrée, toujours sanitizer avant affichage, ne jamais exposer les détails d'erreur en production.
