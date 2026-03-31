const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { logger } = require('../utils/logger');
const { notificationService } = require('../services/notification.service');
const { createAuditLog } = require('../utils/audit');
const { ROLES, isPrivilegedAdmin } = require('../config/roles');

const router = express.Router();

const missionsUploadDir = path.join(__dirname, '../../uploads/missions');
const uploadMissionFile = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(missionsUploadDir, { recursive: true });
            cb(null, missionsUploadDir);
        },
        filename(req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10) || '.bin';
            const safe = `${req.params.id}_${Date.now()}${ext}`;
            cb(null, safe);
        },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
});

const canEditMission = (mission, user) =>
    mission.createdById === user?.id || isPrivilegedAdmin(user?.role);

async function getMissionConflictForUser(prisma, userId, start, end, excludeMissionId = null) {
    return prisma.mission.findFirst({
        where: {
            status: { not: 'CANCELLED' },
            ...(excludeMissionId ? { id: { not: excludeMissionId } } : {}),
            startTime: { lt: end },
            endTime: { gt: start },
            OR: [
                { createdById: userId },
                { assignments: { some: { userId } } },
            ],
        },
        select: { id: true, title: true, startTime: true, endTime: true },
    });
}

/**
 * GET /api/missions - Liste des missions (créées par l'utilisateur ou où il est assigné)
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const isAdmin = isPrivilegedAdmin(req.user?.role);
        const q = String(req.query.q || '').trim();
        const directionId = String(req.query.directionId || '').trim() || null;
        const projectId = String(req.query.projectId || '').trim() || null;
        const status = String(req.query.status || '').trim() || null;
        const from = req.query.from ? new Date(req.query.from) : null;
        const to = req.query.to ? new Date(req.query.to) : null;
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const skip = (page - 1) * limit;
        const contains = q ? { contains: q, mode: 'insensitive' } : null;

        const where = {
            ...(isAdmin
                ? {}
                : {
                    OR: [
                        { createdById: userId },
                        { assignments: { some: { userId } } },
                    ],
                }),
            ...(status
                ? { status }
                : { status: { not: 'CANCELLED' } }),
            ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
            ...(directionId ? { directionId } : {}),
            ...(projectId ? { projectId } : {}),
            ...(contains
                ? {
                    AND: [{
                        OR: [
                            { title: contains },
                            { description: contains },
                            { location: contains },
                            { direction: { is: { name: contains } } },
                            { direction: { is: { code: contains } } },
                            { project: { is: { name: contains } } },
                            { project: { is: { code: contains } } },
                        ],
                    }],
                }
                : {}),
        };

        const [missions, total] = await Promise.all([
            req.prisma.mission.findMany({
                where,
                include: {
                    createdBy: { select: { id: true, name: true, email: true } },
                    direction: { select: { id: true, name: true, code: true } },
                    project: { select: { id: true, name: true, code: true } },
                    assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
                },
                orderBy: { startTime: 'desc' },
                skip,
                take: limit,
            }),
            req.prisma.mission.count({ where }),
        ]);
        if (q || directionId || projectId || status || from || to || req.query.page || req.query.limit) {
            return res.json({
                items: missions,
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            });
        }
        return res.json(missions);
    } catch (error) {
        logger.error('GET_MISSIONS', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/missions/:id - Détail d'une mission
 */
router.get('/:id', async (req, res) => {
    try {
        const mission = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                direction: { select: { id: true, name: true, code: true } },
                project: { select: { id: true, name: true, code: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
                files: {
                    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
        const userId = req.user?.id;
        const canView =
            mission.createdById === userId ||
            mission.assignments.some((a) => a.userId === userId) ||
            isPrivilegedAdmin(req.user?.role);
        if (!canView) return res.status(403).json({ error: 'Accès non autorisé' });
        res.json(mission);
    } catch (error) {
        logger.error('GET_MISSION', error.message, { missionId: req.params.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/missions - Créer une mission et notifier les intervenants
 */
router.post('/', async (req, res) => {
    try {
        const { title, description, location, startTime, endTime, userIds, directionId, projectId } = req.body || {};
        if (!title || !location || !startTime || !endTime) {
            return res.status(400).json({
                error: 'Titre, lieu, date de début et date de fin sont requis.',
            });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end <= start) {
            return res.status(400).json({ error: 'La fin doit être après le début.' });
        }
        if (directionId) {
            const d = await req.prisma.direction.findUnique({ where: { id: directionId }, select: { id: true } });
            if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
        }
        if (projectId) {
            const p = await req.prisma.project.findUnique({ where: { id: projectId }, select: { id: true, isActive: true, status: true } });
            if (!p) return res.status(400).json({ error: 'Projet introuvable.' });
            if (!p.isActive || p.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Ce projet est en pause ou terminé et ne peut pas être sélectionné.' });
            }
        }

        const mission = await req.prisma.mission.create({
            data: {
                title,
                description: description || null,
                location,
                startTime: start,
                endTime: end,
                directionId: directionId || null,
                projectId: projectId || null,
                createdById: req.user.id,
                status: 'CONFIRMED',
            },
        });
        const assigneeIds = Array.isArray(userIds) ? [...new Set(userIds.filter((id) => id && id !== req.user.id))] : [];
        for (const uid of assigneeIds) {
            const conflict = await getMissionConflictForUser(req.prisma, uid, start, end);
            if (conflict) {
                return res.status(409).json({
                    error: `Conflit mission: cet utilisateur a déjà une mission sur ce créneau (${conflict.title}).`,
                    userId: uid,
                    conflictId: conflict.id,
                });
            }
        }
        if (assigneeIds.length > 0) {
            await req.prisma.missionAssignment.createMany({
                data: assigneeIds.map((userId) => ({ missionId: mission.id, userId })),
                skipDuplicates: true,
            });
        }
        const missionWithRelations = await req.prisma.mission.findUnique({
            where: { id: mission.id },
            include: {
                createdBy: { select: { name: true, email: true } },
                direction: { select: { id: true, name: true, code: true } },
                project: { select: { id: true, name: true, code: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        const createdByName = missionWithRelations.createdBy.name;
        const link = `/missions/${mission.id}`;
        for (const a of missionWithRelations.assignments) {
            const u = a.user;
            try {
                await notificationService.sendFullNotification(
                    req.prisma,
                    u.id,
                    u.email,
                    'MISSION_CREATED',
                    'MISSION_CREATED',
                    [u, { ...mission, startTime: mission.startTime, endTime: mission.endTime }, createdByName],
                    'Nouvelle mission assignée',
                    `Mission « ${mission.title} » le ${new Date(mission.startTime).toLocaleDateString('fr-FR')} à ${mission.location}.`,
                    link
                );
            } catch (err) {
                logger.warn('MISSION_NOTIFY_FAILED', err.message, { userId: u.id, missionId: mission.id });
            }
        }
        await createAuditLog(req, 'MISSION_CREATED', 'Mission', mission.id, `Mission ${mission.title} créée`);
        res.status(201).json(missionWithRelations);
    } catch (error) {
        logger.error('CREATE_MISSION', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/missions/:id - Modifier une mission (créateur ou admin)
 */
router.put('/:id', async (req, res) => {
    try {
        const mission = await req.prisma.mission.findUnique({ where: { id: req.params.id }, include: { assignments: true } });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
        if (!canEditMission(mission, req.user)) {
            return res.status(403).json({ error: 'Seul le créateur ou un administrateur peut modifier cette mission.' });
        }
        const { title, description, location, startTime, endTime, userIds, directionId, projectId } = req.body || {};
        const data = {};
        if (title != null) data.title = title;
        if (description != null) data.description = description;
        if (location != null) data.location = location;
        if (startTime != null) data.startTime = new Date(startTime);
        if (endTime != null) data.endTime = new Date(endTime);
        if (directionId !== undefined) {
            if (directionId) {
                const d = await req.prisma.direction.findUnique({ where: { id: directionId }, select: { id: true } });
                if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
            }
            data.directionId = directionId || null;
        }
        if (projectId !== undefined) {
            if (projectId) {
                const p = await req.prisma.project.findUnique({ where: { id: projectId }, select: { id: true, isActive: true, status: true } });
                if (!p) return res.status(400).json({ error: 'Projet introuvable.' });
                if (!p.isActive || p.status !== 'ACTIVE') {
                    return res.status(400).json({ error: 'Ce projet est en pause ou terminé et ne peut pas être sélectionné.' });
                }
            }
            data.projectId = projectId || null;
        }
        if (Object.keys(data).length) {
            await req.prisma.mission.update({ where: { id: req.params.id }, data });
        }
        if (Array.isArray(userIds)) {
            const targetStart = data.startTime || mission.startTime;
            const targetEnd = data.endTime || mission.endTime;
            const newIds = [...new Set(userIds.filter((id) => id))];
            for (const uid of newIds) {
                const conflict = await getMissionConflictForUser(req.prisma, uid, targetStart, targetEnd, mission.id);
                if (conflict) {
                    return res.status(409).json({
                        error: `Conflit mission: cet utilisateur a déjà une mission sur ce créneau (${conflict.title}).`,
                        userId: uid,
                        conflictId: conflict.id,
                    });
                }
            }
            await req.prisma.missionAssignment.deleteMany({ where: { missionId: req.params.id } });
            if (newIds.length) {
                await req.prisma.missionAssignment.createMany({
                    data: newIds.map((userId) => ({ missionId: req.params.id, userId })),
                    skipDuplicates: true,
                });
            }
        }
        const updated = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                direction: { select: { id: true, name: true, code: true } },
                project: { select: { id: true, name: true, code: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        const createdByName = updated?.createdBy?.name || 'Un utilisateur';
        const link = `/missions/${updated.id}`;
        for (const a of updated?.assignments || []) {
            const u = a.user;
            try {
                await notificationService.sendFullNotification(
                    req.prisma,
                    u.id,
                    u.email,
                    'MISSION_UPDATED',
                    'MISSION_UPDATED',
                    [u, { ...updated, startTime: updated.startTime, endTime: updated.endTime }, createdByName],
                    'Mission modifiée',
                    `La mission « ${updated.title} » a été modifiée. Lieu : ${updated.location}.`,
                    link
                );
            } catch (err) {
                logger.warn('MISSION_UPDATE_NOTIFY_FAILED', err.message, { userId: u.id, missionId: updated.id });
            }
        }
        await createAuditLog(req, 'MISSION_UPDATED', 'Mission', req.params.id, `Mission ${updated.title} modifiée`);
        res.json(updated);
    } catch (error) {
        logger.error('UPDATE_MISSION', error.message, { missionId: req.params.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/missions/:id - Annuler une mission (créateur ou admin)
 */
router.delete('/:id', async (req, res) => {
    try {
        const mission = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { name: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
        if (!canEditMission(mission, req.user)) {
            return res.status(403).json({ error: 'Seul le créateur ou un administrateur peut annuler cette mission.' });
        }
        await req.prisma.mission.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
        });
        const createdByName = mission.createdBy?.name || 'Un utilisateur';
        for (const a of mission.assignments || []) {
            const u = a.user;
            try {
                await notificationService.sendEmail(u.email, 'MISSION_CANCELLED', [u, mission, createdByName]);
                await notificationService.createNotification(
                    req.prisma,
                    u.id,
                    'MISSION_CANCELLED',
                    'Mission annulée',
                    `La mission « ${mission.title } » (${mission.location}) a été annulée.`,
                    null
                );
            } catch (err) {
                logger.warn('MISSION_CANCEL_NOTIFY_FAILED', err.message, { userId: u.id, missionId: mission.id });
            }
        }
        await createAuditLog(req, 'MISSION_CANCELLED', 'Mission', req.params.id, `Mission ${mission.title} annulée`);
        res.json({ success: true });
    } catch (error) {
        logger.error('DELETE_MISSION', error.message, { missionId: req.params.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/missions/:id/files - Ajouter un fichier (image ou document)
 */
router.post('/:id/files', uploadMissionFile.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier envoyé. Utilisez le champ "file".' });
        }
        const mission = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: { assignments: true },
        });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });

        const userId = req.user?.id;
        const canView =
            mission.createdById === userId ||
            mission.assignments.some((a) => a.userId === userId) ||
            isPrivilegedAdmin(req.user?.role);
        if (!canView) return res.status(403).json({ error: 'Accès non autorisé' });

        const rawKind = String(req.body?.kind || 'DOCUMENT').toUpperCase();
        const allowedKinds = ['IMAGE', 'DOCUMENT'];
        const kind = allowedKinds.includes(rawKind) ? rawKind : 'DOCUMENT';
        const fileUrl = `/uploads/missions/${req.file.filename}`;

        const saved = await req.prisma.missionFile.create({
            data: {
                missionId: mission.id,
                uploadedById: req.user.id,
                kind,
                fileName: req.file.originalname || req.file.filename,
                fileUrl,
                mimeType: req.file.mimetype || null,
                size: req.file.size || null,
            },
            include: { uploadedBy: { select: { id: true, name: true, email: true } } },
        });

        await createAuditLog(req, 'MISSION_FILE_ADDED', 'MissionFile', saved.id, `Fichier "${saved.fileName}" ajouté (${kind})`);
        res.status(201).json(saved);
    } catch (error) {
        logger.error('MISSION_FILE_ADD', error.message, { missionId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/missions/:id/files/:fileId - Supprimer un fichier (auteur uniquement)
 */
router.delete('/:id/files/:fileId', async (req, res) => {
    try {
        const file = await req.prisma.missionFile.findUnique({
            where: { id: req.params.fileId },
            include: { mission: { include: { assignments: true } } },
        });
        if (!file || file.missionId !== req.params.id) {
            return res.status(404).json({ error: 'Fichier introuvable' });
        }
        if (file.uploadedById !== req.user.id && !isPrivilegedAdmin(req.user?.role)) {
            return res.status(403).json({ error: 'Seul l\'utilisateur ayant ajouté ce fichier peut le supprimer.' });
        }

        await req.prisma.missionFile.delete({ where: { id: file.id } });
        const localPath = path.join(missionsUploadDir, path.basename(file.fileUrl || ''));
        try {
            if (localPath && fs.existsSync(localPath)) fs.unlinkSync(localPath);
        } catch {}

        await createAuditLog(req, 'MISSION_FILE_DELETED', 'MissionFile', file.id, `Fichier "${file.fileName}" supprimé`);
        res.json({ success: true });
    } catch (error) {
        logger.error('MISSION_FILE_DELETE', error.message, { missionId: req.params.id, fileId: req.params.fileId });
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
