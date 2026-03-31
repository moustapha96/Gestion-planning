/**
 * Routes /api/push — Gestion des tokens de notifications push (Capacitor / FCM / APNs)
 *
 * POST   /api/push/register    — Enregistrer un device token (connexion / démarrage app)
 * DELETE /api/push/unregister  — Supprimer un device token (déconnexion)
 * GET    /api/push/tokens       — Lister les tokens de l'utilisateur courant (debug)
 */
const express = require('express');
const { logger, auditLogger } = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/push/register
 * Body: { token: string, platform: 'android'|'ios'|'web' }
 */
router.post('/register', async (req, res) => {
    try {
        const { token, platform } = req.body || {};

        if (!token || typeof token !== 'string' || token.length < 10) {
            return res.status(400).json({ error: 'Token push invalide.' });
        }
        if (!['android', 'ios', 'web'].includes(platform)) {
            return res.status(400).json({ error: 'Platform doit être android, ios ou web.' });
        }

        // Upsert : un même token peut changer d'utilisateur (ex: partage de device)
        await req.prisma.deviceToken.upsert({
            where:  { token },
            create: { userId: req.user.id, token, platform },
            update: { userId: req.user.id, platform },
        });

        logger.info('PUSH_TOKEN_REGISTERED', `Token ${platform} enregistré`, {
            userId:   req.user.id,
            platform,
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('PUSH_TOKEN_REGISTER', error.message, { userId: req.user?.id });
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement du token.' });
    }
});

/**
 * DELETE /api/push/unregister
 * Body: { token: string }
 */
router.delete('/unregister', async (req, res) => {
    try {
        const { token } = req.body || {};

        if (!token) {
            return res.status(400).json({ error: 'Token requis.' });
        }

        await req.prisma.deviceToken.deleteMany({
            where: { token, userId: req.user.id },
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('PUSH_TOKEN_UNREGISTER', error.message, { userId: req.user?.id });
        res.status(500).json({ error: 'Erreur lors de la suppression du token.' });
    }
});

/**
 * DELETE /api/push/unregister-all
 * Supprime tous les tokens de l'utilisateur (déconnexion complète).
 */
router.delete('/unregister-all', async (req, res) => {
    try {
        await req.prisma.deviceToken.deleteMany({
            where: { userId: req.user.id },
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/push/tokens
 * Retourne les tokens enregistrés de l'utilisateur courant (pour debug).
 */
router.get('/tokens', async (req, res) => {
    try {
        const tokens = await req.prisma.deviceToken.findMany({
            where:   { userId: req.user.id },
            select:  { id: true, platform: true, createdAt: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ tokens });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
