const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { z } = require('zod');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../utils/audit');
const { isPrivilegedAdmin } = require('../config/roles');
const { notificationService } = require('../services/notification.service');

const router = express.Router();

const ALLOWED_KEYS = [
    '2fa_enabled',
    'integrated_visio_enabled',
    'direct_messages_enabled',
    'app_name',
    'app_contact_email',
    'app_contact_phone',
    'app_contact_address',
    'app_footer_text',
    'app_logo_url',
];

const DEFAULTS = {
    '2fa_enabled': 'false',
    'integrated_visio_enabled': 'true',
    'direct_messages_enabled': 'true',
    'app_name': 'Gestion Planning',
    'app_contact_email': '',
    'app_contact_phone': '',
    'app_contact_address': '',
    'app_footer_text': '© 2026 Gestion Planning - Tous droits réservés',
    'app_logo_url': '',
};

const brandingUploadDir = path.join(__dirname, '../../uploads/branding');
const uploadLogo = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(brandingUploadDir, { recursive: true });
            cb(null, brandingUploadDir);
        },
        filename(_req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase();
            cb(null, `app_logo_${Date.now()}${ext || '.png'}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * GET /api/admin/settings
 * Retourne tous les paramètres globaux (ADMIN uniquement)
 */
router.get('/', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
        }
        const rows = await req.prisma.appSetting.findMany();
        const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        Object.entries(DEFAULTS).forEach(([k, v]) => {
            if (!(k in settings)) settings[k] = v;
        });
        res.json(settings);
    } catch (error) {
        logger.error('GET_ADMIN_SETTINGS', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/settings/public
 * Retourne les paramètres globaux non sensibles (utilisateur connecté)
 */
router.get('/public', async (req, res) => {
    try {
        const rows = await req.prisma.appSetting.findMany({
            where: {
                key: {
                    in: [
                        'integrated_visio_enabled',
                        'direct_messages_enabled',
                        'app_name',
                        'app_contact_email',
                        'app_contact_phone',
                        'app_contact_address',
                        'app_footer_text',
                        'app_logo_url',
                    ],
                },
            },
        });
        const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        [
            'integrated_visio_enabled',
            'direct_messages_enabled',
            'app_name',
            'app_contact_email',
            'app_contact_phone',
            'app_contact_address',
            'app_footer_text',
            'app_logo_url',
        ].forEach((k) => {
            if (!(k in settings)) settings[k] = DEFAULTS[k];
        });
        res.json(settings);
    } catch (error) {
        logger.error('GET_PUBLIC_SETTINGS', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/admin/settings
 * Met à jour un ou plusieurs paramètres (ADMIN uniquement)
 * Body: { "2fa_enabled": "true" | "false", ... }
 */
router.put('/', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
        }
        const body = req.body || {};
        const updates = [];

        for (const key of ALLOWED_KEYS) {
            if (key in body) {
                const value = String(body[key]);
                updates.push(
                    req.prisma.appSetting.upsert({
                        where: { key },
                        update: { value },
                        create: { key, value },
                    })
                );
            }
        }

        if (!updates.length) {
            return res.status(400).json({ error: 'Aucun paramètre valide fourni.' });
        }

        await Promise.all(updates);

        const rows = await req.prisma.appSetting.findMany();
        const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

        await createAuditLog(
            req, 'ADMIN_SETTINGS_UPDATED', 'AppSetting', 'global',
            `Paramètres mis à jour : ${Object.keys(body).join(', ')}`
        );
        logger.info('ADMIN_SETTINGS_UPDATED', 'Paramètres modifiés', { userId: req.user.id, keys: Object.keys(body) });

        res.json(settings);
    } catch (error) {
        logger.error('PUT_ADMIN_SETTINGS', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

const testEmailSchema = z.object({
    to: z.string().email().optional(),
    verifyOnly: z.boolean().optional(),
});

/**
 * GET /api/admin/settings/email-config
 * Résumé SMTP (sans mot de passe) — ADMIN uniquement
 */
router.get('/email-config', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
        }
        res.json({
            smtp: notificationService.getSmtpConfigSummary(),
            hint: 'Les paramètres SMTP se modifient dans backend/.env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).',
        });
    } catch (error) {
        logger.error('GET_ADMIN_EMAIL_CONFIG', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/settings/test-email
 * Vérifie la connexion SMTP et/ou envoie un e-mail de test — ADMIN uniquement
 * Body: { to?: string, verifyOnly?: boolean }
 */
router.post('/test-email', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
        }

        const parsed = testEmailSchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({ error: 'Adresse e-mail invalide.' });
        }

        const { verifyOnly } = parsed.data;
        let to = parsed.data.to?.trim();

        if (!verifyOnly) {
            if (!to) {
                const rows = await req.prisma.appSetting.findMany({
                    where: { key: { in: ['app_contact_email'] } },
                });
                const contact = rows.find((r) => r.key === 'app_contact_email')?.value?.trim();
                to = contact || req.user?.email;
            }
            if (!to) {
                return res.status(400).json({
                    error: 'Indiquez une adresse de destination ou renseignez l’e-mail de contact dans la configuration.',
                });
            }
        }

        const smtp = notificationService.getSmtpConfigSummary();
        if (!smtp.authConfigured && smtp.host !== 'localhost') {
            logger.warn('EMAIL_TEST', 'SMTP_USER ou SMTP_PASS manquant', { userId: req.user.id });
        }

        await notificationService.verifySmtpConnection();

        if (verifyOnly) {
            await createAuditLog(req, 'ADMIN_SMTP_VERIFY', 'AppSetting', 'smtp', 'Connexion SMTP vérifiée');
            return res.json({
                ok: true,
                verified: true,
                smtp,
                message: 'Connexion au serveur SMTP réussie.',
            });
        }

        const brandingRows = await req.prisma.appSetting.findMany({
            where: { key: 'app_name' },
        });
        const appName = brandingRows[0]?.value || 'Gestion Planning';

        const result = await notificationService.sendTestEmail(to, {
            adminName: req.user?.name || req.user?.email,
            appName,
        });

        if (!result.success) {
            return res.status(502).json({
                error: result.error || 'Échec d’envoi de l’e-mail de test.',
                smtp,
            });
        }

        await createAuditLog(
            req, 'ADMIN_TEST_EMAIL', 'AppSetting', 'smtp',
            `E-mail de test envoyé à ${to}`,
        );

        res.json({
            ok: true,
            verified: true,
            sent: true,
            to,
            messageId: result.messageId,
            smtp,
            message: `E-mail de test envoyé à ${to}. Vérifiez la boîte de réception (et les spams).`,
        });
    } catch (error) {
        logger.error('POST_ADMIN_TEST_EMAIL', error.message, { userId: req.user?.id });
        const smtp = notificationService.getSmtpConfigSummary();
        const isGmail = /gmail\.com|googlemail\.com/i.test(smtp.host || '');
        let hint = null;
        if (error.code === 'EAUTH' || /535|530|authentication/i.test(String(error.message || ''))) {
            hint = isGmail
                ? 'Gmail : utilisez un mot de passe d’application (compte Google → Sécurité → Validation en 2 étapes → Mots de passe des applications). Pas le mot de passe du compte. Régénérez-le si l’ancien a été exposé ou révoqué. SMTP_USER = adresse Gmail complète, SMTP_PASS = 16 caractères sans espaces.'
                : 'Authentification refusée : vérifiez SMTP_USER et SMTP_PASS dans backend/.env, puis redémarrez le backend (PM2 ou systemd).';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            hint = 'Impossible de joindre le serveur : vérifiez SMTP_HOST, SMTP_PORT et le pare-feu.';
        }
        res.status(502).json({
            error: error.message || 'Échec du test e-mail.',
            hint,
            smtp,
        });
    }
});

/**
 * POST /api/admin/settings/logo
 * Upload logo global application (ADMIN uniquement)
 */
router.post('/logo', uploadLogo.single('logo'), async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun logo reçu.' });
        }
        if (req.file.mimetype && !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Le logo doit être une image.' });
        }

        const logoUrl = `/uploads/branding/${req.file.filename}`;
        const previous = await req.prisma.appSetting.findUnique({ where: { key: 'app_logo_url' } });
        await req.prisma.appSetting.upsert({
            where: { key: 'app_logo_url' },
            update: { value: logoUrl },
            create: { key: 'app_logo_url', value: logoUrl },
        });

        if (previous?.value && previous.value.startsWith('/uploads/branding/')) {
            const previousPath = path.join(brandingUploadDir, path.basename(previous.value));
            try {
                if (fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
            } catch {}
        }

        await createAuditLog(req, 'ADMIN_SETTINGS_LOGO_UPDATED', 'AppSetting', 'app_logo_url', logoUrl);
        return res.json({ app_logo_url: logoUrl });
    } catch (error) {
        logger.error('POST_ADMIN_SETTINGS_LOGO', error.message, { userId: req.user?.id });
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
