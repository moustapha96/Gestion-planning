const path = require('path');
const fs = require('fs');
const roleMiddleware = require('../middlewares/role.middleware');
const { ROLES } = require('../config/roles');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../utils/audit');
const {
    ensureBackupsDir,
    createDatabaseBackup,
    runPsqlFromFile,
    getBackupNotifyEmail,
} = require('../services/backup.service');

const router = require('express').Router();

router.use(roleMiddleware([ROLES.SUPER_ADMIN]));

/**
 * GET /api/super-admin/backups — liste des sauvegardes
 */
router.get('/backups', async (req, res) => {
    try {
        const rows = await req.prisma.backup.findMany({
            orderBy: { startedAt: 'desc' },
            take: 200,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });
        res.json({ items: rows, notifyEmail: getBackupNotifyEmail() });
    } catch (e) {
        logger.error('SUPER_ADMIN_BACKUPS_LIST', e.message);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/super-admin/backups — lancer une sauvegarde manuelle
 */
router.post('/backups', async (req, res) => {
    try {
        ensureBackupsDir();
        const backup = await createDatabaseBackup(req.prisma, {
            userId: req.user.id,
            kind: 'MANUAL',
        });
        await createAuditLog(req, 'BACKUP_CREATED', 'Backup', backup.id, `Sauvegarde ${backup.fileName}`);
        res.status(201).json(backup);
    } catch (e) {
        logger.error('SUPER_ADMIN_BACKUP_CREATE', e.message);
        res.status(500).json({ error: e.message || 'Échec de la sauvegarde' });
    }
});

/**
 * GET /api/super-admin/backups/:id/download
 */
router.get('/backups/:id/download', async (req, res) => {
    try {
        const row = await req.prisma.backup.findUnique({ where: { id: req.params.id } });
        if (!row || row.status !== 'SUCCESS') {
            return res.status(404).json({ error: 'Sauvegarde introuvable ou incomplète.' });
        }
        const abs = path.join(__dirname, '../..', row.relativePath);
        if (!fs.existsSync(abs)) {
            return res.status(404).json({ error: 'Fichier absent du serveur.' });
        }
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.fileName)}"`);
        fs.createReadStream(abs).pipe(res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * DELETE /api/super-admin/backups/:id — supprimer une sauvegarde
 */
router.delete('/backups/:id', async (req, res) => {
    try {
        const row = await req.prisma.backup.findUnique({ where: { id: req.params.id } });
        if (!row) return res.status(404).json({ error: 'Introuvable' });
        const abs = path.join(__dirname, '../..', row.relativePath);
        try {
            if (fs.existsSync(abs)) fs.unlinkSync(abs);
        } catch (err) {
            logger.warn('BACKUP_DELETE_FILE', err.message);
        }
        await req.prisma.backup.delete({ where: { id: row.id } });
        await createAuditLog(req, 'BACKUP_DELETED', 'Backup', row.id, `Suppression ${row.fileName}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/super-admin/backups/:id/restore
 * body: { confirm: true } — opération destructive / sensible
 */
router.post('/backups/:id/restore', async (req, res) => {
    try {
        if (!req.body?.confirm) {
            return res.status(400).json({ error: 'Confirmation requise (confirm: true).' });
        }
        const row = await req.prisma.backup.findUnique({ where: { id: req.params.id } });
        if (!row || row.status !== 'SUCCESS') {
            return res.status(404).json({ error: 'Sauvegarde introuvable ou invalide.' });
        }
        const abs = path.join(__dirname, '../..', row.relativePath);
        if (!fs.existsSync(abs)) {
            return res.status(404).json({ error: 'Fichier absent du serveur.' });
        }
        await createAuditLog(req, 'BACKUP_RESTORE_START', 'Backup', row.id, `Restauration depuis ${row.fileName}`);
        await runPsqlFromFile(abs);
        await createAuditLog(req, 'BACKUP_RESTORE_DONE', 'Backup', row.id, `Restauration terminée ${row.fileName}`);
        res.json({ success: true, message: 'Restauration exécutée. Redémarrez l’application si nécessaire.' });
    } catch (e) {
        logger.error('BACKUP_RESTORE', e.message);
        res.status(500).json({ error: e.message || 'Échec de la restauration' });
    }
});

/**
 * GET /api/super-admin/documents — fichiers joints (missions, réunions, messages)
 */
router.get('/documents', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim().toLowerCase();
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 300));

        const [missionFiles, meetingFiles, dmFiles] = await Promise.all([
            req.prisma.missionFile.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    mission: { select: { id: true, title: true } },
                    uploadedBy: { select: { id: true, name: true, email: true } },
                },
            }),
            req.prisma.meetingFile.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    meeting: { select: { id: true, title: true } },
                    uploadedBy: { select: { id: true, name: true, email: true } },
                },
            }),
            req.prisma.directMessage.findMany({
                where: { fileUrl: { not: null } },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    sender: { select: { id: true, name: true, email: true } },
                    receiver: { select: { id: true, name: true, email: true } },
                },
            }),
        ]);

        const items = [];

        missionFiles.forEach((f) => {
            items.push({
                id: `mission:${f.id}`,
                kind: 'MISSION_FILE',
                fileName: f.fileName,
                fileUrl: f.fileUrl,
                mimeType: f.mimeType,
                size: f.size,
                createdAt: f.createdAt,
                label: f.mission?.title || 'Mission',
                contextLink: `/missions/${f.missionId}`,
                uploadedBy: f.uploadedBy,
            });
        });

        meetingFiles.forEach((f) => {
            items.push({
                id: `meeting:${f.id}`,
                kind: 'MEETING_FILE',
                fileName: f.fileName,
                fileUrl: f.fileUrl,
                mimeType: f.mimeType,
                size: f.size,
                createdAt: f.createdAt,
                label: f.meeting?.title || 'Réunion',
                contextLink: `/meetings/${f.meetingId}`,
                uploadedBy: f.uploadedBy,
            });
        });

        dmFiles.forEach((m) => {
            items.push({
                id: `dm:${m.id}`,
                kind: 'DIRECT_MESSAGE_FILE',
                fileName: m.fileName || 'fichier',
                fileUrl: m.fileUrl,
                mimeType: m.mimeType,
                size: m.size,
                createdAt: m.createdAt,
                label: 'Messagerie directe',
                contextLink: '/discussions',
                uploadedBy: m.sender,
                meta: { to: m.receiver?.name || m.receiver?.email },
            });
        });

        let filtered = items;
        if (q) {
            filtered = items.filter((it) =>
                (it.fileName || '').toLowerCase().includes(q) ||
                (it.label || '').toLowerCase().includes(q) ||
                (it.uploadedBy?.name || '').toLowerCase().includes(q));
        }
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            items: filtered.slice(0, limit),
            total: filtered.length,
        });
    } catch (e) {
        logger.error('SUPER_ADMIN_DOCUMENTS', e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
