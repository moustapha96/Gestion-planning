const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();

/** Vérifie si la 2FA est activée globalement */
async function is2FAGloballyEnabled(prisma) {
    try {
        const setting = await prisma.appSetting.findUnique({ where: { key: '2fa_enabled' } });
        return setting?.value === 'true';
    } catch {
        return false;
    }
}

/**
 * GET /api/2fa/setup
 * Génère un secret temporaire + QR code pour l'utilisateur
 * Le secret n'est PAS encore sauvegardé en base (seulement après vérification)
 */
router.get('/setup', async (req, res) => {
    try {
        const enabled = await is2FAGloballyEnabled(req.prisma);
        if (!enabled) {
            return res.status(403).json({ error: 'La double authentification n\'est pas activée sur cette instance.' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: 'La 2FA est déjà activée sur votre compte.' });
        }

        // Générer un nouveau secret TOTP
        const secret = speakeasy.generateSecret({
            name: `Gestion Planning (${user.email})`,
            issuer: 'Gestion Planning',
            length: 20,
        });

        // Générer le QR code en base64
        const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

        // Stocker le secret temporairement (en attente de vérification)
        await req.prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorSecret: secret.base32 }, // stocké non activé
        });

        res.json({
            secret: secret.base32,
            qrCode: qrCodeDataUrl,
            otpauthUrl: secret.otpauth_url,
        });
    } catch (error) {
        logger.error('2FA_SETUP', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/2fa/enable
 * Confirme le secret en vérifiant le premier code TOTP
 * Active la 2FA sur le compte
 */
router.post('/enable', async (req, res) => {
    try {
        const enabled = await is2FAGloballyEnabled(req.prisma);
        if (!enabled) {
            return res.status(403).json({ error: 'La double authentification n\'est pas activée sur cette instance.' });
        }

        const { code } = req.body || {};
        if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
            return res.status(400).json({ error: 'Code à 6 chiffres requis.' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (!user.twoFactorSecret) {
            return res.status(400).json({ error: 'Lancez d\'abord la configuration via GET /api/2fa/setup.' });
        }
        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: 'La 2FA est déjà activée.' });
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code.trim(),
            window: 1, // tolérance ±30s
        });

        if (!valid) {
            return res.status(400).json({ error: 'Code invalide. Vérifiez l\'heure de votre appareil et réessayez.' });
        }

        await req.prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorEnabled: true },
        });

        await createAuditLog(req, '2FA_ENABLED', 'User', req.user.id, '2FA activée par l\'utilisateur');
        logger.info('2FA_ENABLED', `2FA activée pour ${user.email}`, { userId: user.id });

        res.json({ success: true, message: 'Double authentification activée avec succès.' });
    } catch (error) {
        logger.error('2FA_ENABLE', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/2fa/disable
 * Désactive la 2FA — nécessite le mot de passe et le code TOTP actuel
 */
router.post('/disable', async (req, res) => {
    try {
        const { password, code } = req.body || {};
        if (!password) return res.status(400).json({ error: 'Mot de passe requis.' });
        if (!code || !/^\d{6}$/.test(String(code).trim())) {
            return res.status(400).json({ error: 'Code 2FA à 6 chiffres requis.' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (!user.twoFactorEnabled) {
            return res.status(400).json({ error: 'La 2FA n\'est pas activée sur votre compte.' });
        }

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return res.status(401).json({ error: 'Mot de passe incorrect.' });

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: String(code).trim(),
            window: 1,
        });
        if (!valid) return res.status(400).json({ error: 'Code 2FA invalide.' });

        await req.prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });

        await createAuditLog(req, '2FA_DISABLED', 'User', req.user.id, '2FA désactivée par l\'utilisateur');
        logger.info('2FA_DISABLED', `2FA désactivée pour ${user.email}`, { userId: user.id });

        res.json({ success: true, message: 'Double authentification désactivée.' });
    } catch (error) {
        logger.error('2FA_DISABLE', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/2fa/login  (route PUBLIQUE — pas de authMiddleware)
 * Valide le code TOTP après la première étape de connexion
 * Body: { tempToken: string, code: string }
 */
router.post('/login', async (req, res) => {
    try {
        const { tempToken, code } = req.body || {};
        if (!tempToken || !code) {
            return res.status(400).json({ error: 'tempToken et code requis.' });
        }

        // Vérifier le token temporaire
        let payload;
        try {
            payload = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Token expiré ou invalide. Reconnectez-vous.' });
        }

        if (payload.purpose !== '2fa_challenge') {
            return res.status(401).json({ error: 'Token invalide.' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return res.status(401).json({ error: 'Utilisateur introuvable ou 2FA non configurée.' });
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: String(code).trim(),
            window: 1,
        });
        if (!valid) {
            logger.warn('2FA_LOGIN_FAILED', `Code 2FA invalide pour ${user.email}`, { userId: user.id });
            return res.status(401).json({ error: 'Code invalide. Vérifiez votre application d\'authentification.' });
        }

        // Émettre les vrais tokens
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

        const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
        const match = refreshExpiry.match(/^(\d+)(d|h|m|s)$/i);
        let refreshMs = 7 * 86400000;
        if (match) {
            const n = parseInt(match[1]);
            const u = match[2].toLowerCase();
            refreshMs = n * ({ d: 86400000, h: 3600000, m: 60000, s: 1000 }[u] || 86400000);
        }

        await req.prisma.refreshToken.create({
            data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + refreshMs) },
        });

        logger.info('2FA_LOGIN_SUCCESS', `Connexion 2FA réussie pour ${user.email}`, { userId: user.id });

        res.json({
            accessToken,
            refreshToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
        });
    } catch (error) {
        logger.error('2FA_LOGIN', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/2fa/status
 * Retourne le statut 2FA de l'utilisateur connecté
 */
router.get('/status', async (req, res) => {
    try {
        const [user, setting] = await Promise.all([
            req.prisma.user.findUnique({
                where: { id: req.user.id },
                select: { twoFactorEnabled: true },
            }),
            req.prisma.appSetting.findUnique({ where: { key: '2fa_enabled' } }),
        ]);
        res.json({
            globallyEnabled: setting?.value === 'true',
            userEnabled: user?.twoFactorEnabled ?? false,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
module.exports.is2FAGloballyEnabled = is2FAGloballyEnabled;
