const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../utils/audit');
const { isPrivilegedAdmin } = require('../config/roles');

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
