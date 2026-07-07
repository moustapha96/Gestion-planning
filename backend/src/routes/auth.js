const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { z } = require('zod');
const { notificationService } = require('../services/notification.service');
const { logger, auditLogger } = require('../utils/logger');
const authMiddleware = require('../middlewares/auth.middleware');
const { normalizeStoredRole } = require('../config/roles');
const {
    resolveEffectiveRole,
    resolveUserFunctionalCapabilities,
} = require('../services/roleConfig.service');
const {
    validatePasswordStrength,
    findUserByEmail,
    createPasswordResetToken,
    buildPasswordResetUrl,
    verifyPasswordResetToken,
} = require('../utils/passwordUtils');

const router = express.Router();

// Blacklist en mémoire des tempTokens déjà consommés (succès 2FA)
// Nettoyage automatique : chaque token expire au bout de 5 min de toute façon
const usedTempTokens = new Map(); // token → timestamp d'expiration

function markTempTokenUsed(token) {
    usedTempTokens.set(token, Date.now() + 5 * 60 * 1000);
    // Purger les entrées expirées pour éviter une fuite mémoire
    for (const [t, exp] of usedTempTokens) {
        if (Date.now() > exp) usedTempTokens.delete(t);
    }
}

function isTempTokenUsed(token) {
    const exp = usedTempTokens.get(token);
    if (!exp) return false;
    if (Date.now() > exp) { usedTempTokens.delete(token); return false; }
    return true;
}

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
const uploadAvatar = multer({
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
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
        const allowed = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname);
        cb(null, !!allowed);
    },
});

/** Parse expiry string (e.g. '7d', '24h', '15m') to milliseconds */
function parseExpiryToMs(expiry) {
    if (!expiry || typeof expiry !== 'string') return 7 * 24 * 60 * 60 * 1000;
    const match = expiry.trim().match(/^(\d+)(d|h|m|s)$/i);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const [, n, unit] = match;
    const num = parseInt(n, 10);
    const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
    return num * (multipliers[unit.toLowerCase()] || 86400000);
}

/** Objet utilisateur renvoyé au client après login / 2FA (hors secrets). */
function toAuthClientUser(u) {
    if (!u) return null;
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        storedRole: u.storedRole ?? u.role,
        functionalCapabilities: u.functionalCapabilities || null,
        avatarUrl: u.avatarUrl,
        updatedAt: u.updatedAt || null,
        directionId: u.directionId || null,
        projectId: u.projectId || null,
        phone: u.phone || null,
        jobTitle: u.jobTitle || null,
        cellUnit: u.cellUnit || null,
        direction: u.direction || null,
        project: u.project || null,
    };
}

async function buildAuthClientUser(prisma, dbUser) {
    const [effectiveRole, functionalCapabilities] = await Promise.all([
        resolveEffectiveRole(prisma, dbUser),
        resolveUserFunctionalCapabilities(prisma, dbUser),
    ]);
    return toAuthClientUser({
        ...dbUser,
        role: effectiveRole,
        storedRole: normalizeStoredRole(dbUser.role),
        functionalCapabilities,
    });
}

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification et gestion des tokens
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Se connecter (retourne accessToken + refreshToken + user)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants incorrects
 *       403:
 *         description: Compte désactivé
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await req.prisma.user.findUnique({
            where: { email },
            include: {
                direction: { select: { id: true, name: true, code: true, logoUrl: true } },
                project: { select: { id: true, name: true, code: true, logoUrl: true } },
            },
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            logger.warn('LOGIN_FAILED', `Tentative échouée pour ${email}`, { email, ip: req.ip });
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        if (!user.isActive) {
            logger.warn('LOGIN_DISABLED', `Compte désactivé : ${email}`, { email });
            return res.status(403).json({ error: 'Compte désactivé. Contactez votre administrateur.' });
        }

        // Vérifier si la 2FA est requise
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            const globalSetting = await req.prisma.appSetting.findUnique({ where: { key: '2fa_enabled' } });
            if (globalSetting?.value === 'true') {
                // Émettre un token temporaire (5 min) pour l'étape 2FA
                const tempToken = jwt.sign(
                    { id: user.id, purpose: '2fa_challenge' },
                    process.env.JWT_SECRET,
                    { expiresIn: '5m' }
                );
                logger.info('2FA_CHALLENGE', `Challenge 2FA émis pour ${email}`, { userId: user.id });
                return res.json({ twoFactorRequired: true, tempToken });
            }
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '15m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
        );

        const refreshExpiryMs = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRY);
        await req.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt: new Date(Date.now() + refreshExpiryMs),
            },
        });

        logger.logAuth('LOGIN', email, true);
        auditLogger.info('LOGIN', `Connexion de ${email}`, { userId: user.id, email, ip: req.ip });

        const clientUser = await buildAuthClientUser(req.prisma, user);

        res.json({
            accessToken,
            refreshToken,
            user: clientUser,
        });

        req.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN',
                entity: 'User',
                entityId: user.id,
                ipAddress: req.ip,
                details: `Connexion de ${email}`,
            },
        }).catch(() => {});
    } catch (error) {
        logger.error('LOGIN_ERROR', 'Erreur login', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/2fa-login
 * Étape 2 de la connexion : valider le code TOTP avec le tempToken
 */
router.post('/2fa-login', async (req, res) => {
    try {
        const speakeasy = require('speakeasy');
        const { tempToken, code } = req.body || {};
        if (!tempToken || !code) {
            return res.status(400).json({ error: 'tempToken et code requis.' });
        }

        // Rejeter un tempToken déjà consommé (replay attack / réutilisation après succès)
        if (isTempTokenUsed(tempToken)) {
            return res.status(401).json({ error: 'Session 2FA déjà utilisée. Veuillez vous reconnecter.' });
        }

        let payload;
        try {
            payload = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Token expiré. Reconnectez-vous.' });
        }
        if (payload.purpose !== '2fa_challenge') {
            return res.status(401).json({ error: 'Token invalide.' });
        }

        const user = await req.prisma.user.findUnique({
            where: { id: payload.id },
            include: {
                direction: { select: { id: true, name: true, code: true, logoUrl: true } },
                project: { select: { id: true, name: true, code: true, logoUrl: true } },
            },
        });
        if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return res.status(401).json({ error: '2FA non configurée.' });
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: String(code).trim(),
            window: 1,
        });

        if (!valid) {
            logger.warn('2FA_LOGIN_FAILED', `Code 2FA invalide pour ${user.email}`, { userId: user.id, ip: req.ip });
            auditLogger.warn('2FA_FAILED', `Échec code 2FA pour ${user.email}`, { userId: user.id, ip: req.ip });
            req.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: '2FA_FAILED',
                    entity: 'User',
                    entityId: user.id,
                    ipAddress: req.ip,
                    details: `Code 2FA invalide depuis ${req.ip}`,
                },
            }).catch(() => {});
            return res.status(401).json({ error: 'Code invalide. Vérifiez votre application d\'authentification.' });
        }

        // Consommer le tempToken — ne peut plus être réutilisé
        markTempTokenUsed(tempToken);

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '15m' }
        );
        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
        );
        const refreshExpiryMs = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRY);
        await req.prisma.refreshToken.create({
            data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + refreshExpiryMs) },
        });

        logger.logAuth('LOGIN_2FA', user.email, true);
        auditLogger.info('LOGIN_2FA', `Connexion 2FA réussie pour ${user.email}`, { userId: user.id, ip: req.ip });
        req.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN_2FA',
                entity: 'User',
                entityId: user.id,
                ipAddress: req.ip,
                details: `Connexion 2FA réussie`,
            },
        }).catch(() => {});

        res.json({
            accessToken,
            refreshToken,
            user: await buildAuthClientUser(req.prisma, user),
        });
    } catch (error) {
        logger.error('2FA_LOGIN', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rafraîchir le token d'accès
 *     tags: [Auth]
 *     security: []
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const storedToken = await req.prisma.refreshToken.findUnique({ where: { token: refreshToken } });

        if (!storedToken || storedToken.isRevoked) {
            return res.status(401).json({ error: 'Token révoqué ou invalide' });
        }

        if (new Date() > new Date(storedToken.expiresAt)) {
            await req.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { isRevoked: true },
            }).catch(() => {});
            return res.status(401).json({ error: 'Refresh token expiré' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Compte invalide' });
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '15m' }
        );

        res.json({ accessToken });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Refresh token expiré' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token invalide' });
        }
        logger.warn('REFRESH_TOKEN_ERROR', err.message, {});
        res.status(401).json({ error: 'Token invalide' });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Se déconnecter
 *     tags: [Auth]
 *     security: []
 */
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await req.prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { isRevoked: true },
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/activate:
 *   post:
 *     summary: Activer un compte avec le token reçu par email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compte activé
 *       400:
 *         description: Token invalide ou expiré
 */
router.post('/activate', async (req, res) => {
    try {
        const token = req.body?.token || req.query?.token;
        if (!token) {
            return res.status(400).json({ error: 'Token d\'activation requis' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.purpose !== 'account_activation') {
            return res.status(400).json({ error: 'Token invalide' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(400).json({ error: 'Utilisateur introuvable' });
        }
        if (user.isActive) {
            return res.status(200).json({ success: true, message: 'Compte déjà activé. Vous pouvez vous connecter.' });
        }

        await req.prisma.user.update({
            where: { id: user.id },
            data: { isActive: true },
        });

        auditLogger.info('ACCOUNT_ACTIVATED', `Compte activé : ${user.email}`, { userId: user.id, ip: req.ip });
        res.json({ success: true, message: 'Compte activé. Vous pouvez maintenant vous connecter.' });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(400).json({ error: 'Lien d\'activation expiré. Demandez à l\'administrateur de renvoyer un email d\'activation.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(400).json({ error: 'Token d\'activation invalide' });
        }
        logger.warn('ACTIVATE_ACCOUNT_ERROR', err.message, {});
        res.status(400).json({ error: 'Token invalide' });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authMiddleware, async (req, res) => {
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
                updatedAt: true,
                createdAt: true,
                directionId: true,
                direction: { select: { id: true, name: true, code: true, logoUrl: true } },
                projectId: true,
                project: { select: { id: true, name: true, code: true, logoUrl: true } },
                phone: true,
                jobTitle: true,
                cellUnit: true,
            },
        });
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(await buildAuthClientUser(req.prisma, user));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/me/avatar:
 *   post:
 *     summary: Mettre à jour sa photo de profil
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo mise à jour (avatarUrl dans la réponse)
 *       400:
 *         description: Fichier invalide ou absent
 */
router.post('/me/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier envoyé. Utilisez le champ "avatar" (image JPG, PNG, GIF ou WebP, max 5 Mo).' });
        }
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const updated = await req.prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                updatedAt: true,
                phone: true,
                jobTitle: true,
                cellUnit: true,
                directionId: true,
                direction: { select: { id: true, name: true, code: true, logoUrl: true } },
                projectId: true,
                project: { select: { id: true, name: true, code: true, logoUrl: true } },
            },
        });
        auditLogger.info('AVATAR_UPDATED', `Photo de profil mise à jour`, { userId: req.user.id });
        res.json({ avatarUrl, user: updated });
    } catch (error) {
        logger.error('AVATAR_UPLOAD', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/me/avatar:
 *   delete:
 *     summary: Supprimer sa photo de profil
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photo supprimée
 */
router.delete('/me/avatar', authMiddleware, async (req, res) => {
    try {
        const user = await req.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { avatarUrl: true },
        });
        // Supprimer le fichier physique s'il existe
        if (user?.avatarUrl) {
            const filePath = path.join(__dirname, '../../', user.avatarUrl);
            try { fs.unlinkSync(filePath); } catch (_) { /* fichier déjà absent */ }
        }
        const updated = await req.prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl: null },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                updatedAt: true,
                phone: true,
                jobTitle: true,
                cellUnit: true,
                directionId: true,
                direction: { select: { id: true, name: true, code: true, logoUrl: true } },
                projectId: true,
                project: { select: { id: true, name: true, code: true, logoUrl: true } },
            },
        });
        auditLogger.info('AVATAR_DELETED', 'Photo de profil supprimée', { userId: req.user.id });
        res.json({ avatarUrl: null, user: updated });
    } catch (error) {
        logger.error('AVATAR_DELETE', error.message, { userId: req.user?.id });
        res.status(500).json({ error: 'Erreur lors de la suppression de la photo' });
    }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Changer son propre mot de passe
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 */
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) return res.status(400).json({ error: strengthError });

        const user = await req.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { passwordHistory: { orderBy: { createdAt: 'desc' }, take: 3 } },
        });

        if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
            return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
        }

        // Vérifier historique 3 derniers mots de passe (CDC §3.1.2)
        for (const old of user.passwordHistory) {
            if (await bcrypt.compare(newPassword, old.passwordHash)) {
                return res.status(400).json({ error: 'Impossible de réutiliser un des 3 derniers mots de passe.' });
            }
        }

        const newHash = await bcrypt.hash(newPassword, 12);

        await req.prisma.passwordHistory.create({ data: { userId: req.user.id, passwordHash: newHash } });
        await req.prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: newHash } });

        // Révoquer tous les refresh tokens pour forcer la reconnexion
        await req.prisma.refreshToken.updateMany({
            where: { userId: req.user.id },
            data: { isRevoked: true },
        });

        auditLogger.info('PASSWORD_CHANGED', `Mot de passe changé par ${req.user.email}`, { userId: req.user.id });

        res.json({ success: true, message: 'Mot de passe modifié. Veuillez vous reconnecter.' });
    } catch (error) {
        logger.error('CHANGE_PASSWORD', 'Erreur', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demander une réinitialisation de mot de passe par email
 *     tags: [Auth]
 *     security: []
 */
router.post('/forgot-password', async (req, res) => {
    const genericMessage = 'Si cet email est enregistré, un lien vous a été envoyé.';
    try {
        const { email } = req.body || {};
        if (!email || !String(email).trim()) {
            return res.status(400).json({ error: 'Adresse e-mail requise.' });
        }

        const user = await findUserByEmail(req.prisma, email);

        if (!user || !user.isActive) {
            return res.json({ success: true, message: genericMessage });
        }

        const resetToken = createPasswordResetToken(user);
        const resetUrl = buildPasswordResetUrl(resetToken);
        const emailResult = await notificationService.sendEmail(
            user.email,
            'PASSWORD_RESET',
            [user, resetUrl],
        );

        if (!emailResult?.success) {
            logger.error('FORGOT_PASSWORD_EMAIL', 'Échec envoi e-mail de réinitialisation', {
                email: user.email,
                error: emailResult?.error,
            });
            return res.status(502).json({
                error: 'Impossible d\'envoyer l\'e-mail pour le moment. Réessayez plus tard ou contactez l\'administrateur.',
            });
        }

        logger.info('PASSWORD_RESET_REQUESTED', `Demande reset pour ${user.email}`, { email: user.email });
        res.json({ success: true, message: genericMessage });
    } catch (error) {
        logger.error('FORGOT_PASSWORD', 'Erreur', { error: error.message });
        res.status(500).json({ error: 'Une erreur est survenue. Veuillez réessayer.' });
    }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe via token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
        }

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) return res.status(400).json({ error: strengthError });

        const decoded = jwt.decode(token);
        if (!decoded || decoded.purpose !== 'password_reset') {
            return res.status(400).json({ error: 'Token invalide' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.isDeleted) return res.status(400).json({ error: 'Utilisateur introuvable' });
        if (!user.isActive) {
            return res.status(400).json({
                error: 'Compte désactivé. Contactez votre administrateur ou utilisez le lien d\'activation reçu par e-mail.',
            });
        }

        verifyPasswordResetToken(token, user);

        const newHash = await bcrypt.hash(newPassword, 12);
        await req.prisma.passwordHistory.create({ data: { userId: user.id, passwordHash: newHash } }).catch(() => {});
        await req.prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

        await req.prisma.refreshToken.updateMany({
            where: { userId: user.id },
            data: { isRevoked: true },
        });

        auditLogger.info('PASSWORD_RESET', `Mot de passe réinitialisé pour ${user.email}`, { userId: user.id });

        res.json({ success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ error: 'Lien expiré. Refaites une demande de réinitialisation.' });
        }
        logger.error('RESET_PASSWORD', 'Erreur reset', { error: error.message });
        res.status(400).json({ error: 'Token invalide ou expiré' });
    }
});

/**
 * POST /api/auth/me/push-token
 * Raccourci: enregistre un device token push (appelé depuis mobileService.js).
 */
router.post('/me/push-token', authMiddleware, async (req, res) => {
    try {
        const { token, platform } = req.body || {};
        if (!token || typeof token !== 'string' || token.length < 10) {
            return res.status(400).json({ error: 'Token push invalide.' });
        }
        if (!['android', 'ios', 'web'].includes(platform)) {
            return res.status(400).json({ error: 'Platform invalide.' });
        }
        await req.prisma.deviceToken.upsert({
            where:  { token },
            create: { userId: req.user.id, token, platform },
            update: { userId: req.user.id, platform },
        });
        res.json({ success: true });
    } catch (error) {
        logger.error('PUSH_TOKEN_REGISTER', error.message, { userId: req.user?.id });
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement du token.' });
    }
});

module.exports = router;
