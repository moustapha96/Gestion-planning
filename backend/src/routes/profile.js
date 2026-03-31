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
            select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, createdAt: true },
        });
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/profile — Modifier son profil (nom, email)
 */
router.put('/', async (req, res) => {
    try {
        const { name, email } = req.body || {};
        const data = {};
        if (name) data.name = name.trim();
        if (email) {
            // Vérifier unicité de l'email (CDC §3.1.1)
            const existing = await req.prisma.user.findFirst({
                where: { email: email.toLowerCase(), id: { not: req.user.id } },
            });
            if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
            data.email = email.toLowerCase();
        }
        if (!Object.keys(data).length) return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });

        const updated = await req.prisma.user.update({
            where: { id: req.user.id },
            data,
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        });
        auditLogger.info('PROFILE_UPDATED', `Profil modifié : ${req.user.email}`, { userId: req.user.id });
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
