/**
 * Routes /api/profile — CDC §4.4.2
 * Alias propre vers les fonctionnalités de profil utilisateur.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { logger, auditLogger } = require('../utils/logger');
const { validatePasswordStrength } = require('../utils/passwordUtils');

const router = express.Router();

const MAX_PHONE = 40;
const MAX_JOB_TITLE = 120;
const MAX_CELL_UNIT = 120;

function normContactField(v, maxLen) {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = String(v).trim();
    if (!t) return null;
    return t.slice(0, maxLen);
}

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
const upload = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(avatarsDir, { recursive: true });
            cb(null, avatarsDir);
        },
        filename(req, file, cb) {
            const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
            cb(null, `${req.user.id}${ext}`);
        },
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo max (CDC §3.1.1)
    fileFilter(_req, file, cb) {
        const allowed = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname);
        cb(null, !!allowed);
    },
});

/**
 * GET /api/profile — Consulter son profil
 */
router.get('/', async (req, res) => {
    try {
        const user = await req.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                avatarUrl: true,
                createdAt: true,
                phone: true,
                jobTitle: true,
                cellUnit: true,
                directionId: true,
                direction: { select: { id: true, name: true, code: true, logoUrl: true } },
                projectId: true,
                project: { select: { id: true, name: true, code: true, logoUrl: true } },
            },
        });
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/profile/cell-units — Liste les cellules/services distincts déjà saisis
 * (priorité : utilisateurs de la même direction, sinon toute la base).
 * Retour : { suggestions: [{ value: 'Cellule X', count: 3 }], scope: 'direction'|'global' }
 */
router.get('/cell-units', async (req, res) => {
    try {
        const me = await req.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { directionId: true },
        });

        const where = (directionId) => ({
            cellUnit: { not: null },
            isActive: true,
            ...(directionId ? { directionId } : {}),
        });

        const buildSuggestions = async (directionId) => {
            const rows = await req.prisma.user.groupBy({
                by: ['cellUnit'],
                where: where(directionId),
                _count: { cellUnit: true },
            });
            return rows
                .filter((r) => r.cellUnit && String(r.cellUnit).trim())
                .map((r) => ({ value: r.cellUnit, count: r._count.cellUnit }))
                .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'fr'));
        };

        let suggestions = [];
        let scope = 'global';
        if (me?.directionId) {
            suggestions = await buildSuggestions(me.directionId);
            if (suggestions.length) scope = 'direction';
        }
        if (!suggestions.length) {
            suggestions = await buildSuggestions(null);
        }

        res.json({ suggestions, scope });
    } catch (error) {
        logger.error('CELL_UNITS_LIST', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/profile — Modifier son profil (nom, email, téléphone, poste, cellule — pas la direction / projet)
 */
router.put('/', async (req, res) => {
    try {
        const body = req.body || {};
        const { name, email } = body;
        const data = {};
        if (name !== undefined && name !== null) {
            const n = String(name).trim();
            if (n.length < 2) return res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères.' });
            data.name = n;
        }
        if (email !== undefined && email !== null && String(email).trim()) {
            const em = String(email).toLowerCase().trim();
            const existing = await req.prisma.user.findFirst({
                where: { email: em, id: { not: req.user.id } },
            });
            if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
            data.email = em;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
            data.phone = normContactField(body.phone, MAX_PHONE);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'jobTitle')) {
            data.jobTitle = normContactField(body.jobTitle, MAX_JOB_TITLE);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'cellUnit')) {
            data.cellUnit = normContactField(body.cellUnit, MAX_CELL_UNIT);
        }
        if (!Object.keys(data).length) return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });

        const updated = await req.prisma.user.update({
            where: { id: req.user.id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                phone: true,
                jobTitle: true,
                cellUnit: true,
                directionId: true,
                direction: { select: { id: true, name: true, code: true, logoUrl: true } },
                projectId: true,
                project: { select: { id: true, name: true, code: true, logoUrl: true } },
                createdAt: true,
            },
        });
        auditLogger.info('PROFILE_UPDATED', `Profil modifié : ${updated.email}`, { userId: req.user.id });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/profile/avatar — Upload avatar (max 2 Mo)
 */
router.post('/avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier. Utilisez le champ "avatar" (JPG, PNG, WebP, max 2 Mo).' });
        }
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        await req.prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl } });
        res.json({ avatarUrl });
    } catch (error) {
        logger.error('AVATAR_UPLOAD', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/profile/password — Changer son mot de passe avec validation CDC §3.1.2
 */
router.put('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis.' });
        }

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) return res.status(400).json({ error: strengthError });

        const user = await req.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { passwordHistory: { orderBy: { createdAt: 'desc' }, take: 3 } },
        });

        if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
            return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
        }

        // Vérifier historique des 3 derniers mots de passe (CDC §3.1.2)
        for (const old of user.passwordHistory) {
            if (await bcrypt.compare(newPassword, old.passwordHash)) {
                return res.status(400).json({ error: 'Impossible de réutiliser un des 3 derniers mots de passe.' });
            }
        }

        const newHash = await bcrypt.hash(newPassword, 12);

        await req.prisma.$transaction([
            req.prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: newHash } }),
            req.prisma.passwordHistory.create({ data: { userId: req.user.id, passwordHash: newHash } }),
            req.prisma.refreshToken.updateMany({ where: { userId: req.user.id }, data: { isRevoked: true } }),
        ]);

        auditLogger.info('PASSWORD_CHANGED', `Mot de passe modifié : ${req.user.email}`, { userId: req.user.id });
        res.json({ success: true, message: 'Mot de passe modifié. Veuillez vous reconnecter.' });
    } catch (error) {
        logger.error('CHANGE_PASSWORD', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
