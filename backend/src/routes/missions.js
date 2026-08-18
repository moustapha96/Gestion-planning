const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { logger } = require('../utils/logger');
const { notificationService } = require('../services/notification.service');
const { createAuditLog } = require('../utils/audit');
const {
    ROLES, isPrivilegedAdmin, isSuperAdmin, isResponsable,
} = require('../config/roles');
const { MEETING_PENDING_FINAL } = require('../config/meetingWorkflow');
const {
    missionListWhereForUser,
    canViewMissionForUser,
    canEditMission,
} = require('../config/missionVisibility');
const { validateProjectForUserAction, PROJECT_WITH_RESPONSIBLE_SELECT } = require('../services/projectResponsible.service');
const { isPendingCoordinatorValidation, isPendingConsolidatorValidation } = require('../config/planningWorkflow');
const {
    canCoordinateDraftMission,
    canFinalizePendingMission,
} = require('../services/validationPolicy.service');
const { canUserConsolidateEntity } = require('../services/consolidatorResolution.service');
const { attachMissionValidationWorkflow } = require('../services/validationWorkflow.service');
const { resolveInitialResponsibleStatus, startMissionValidation } = require('../services/validationSubmission.service');
const { resolveAssistantCreation, afterAssistantCreated } = require('../services/directorApproval.service');
const { attachStatusLabel } = require('../config/statusLabels');
const { parseUtcDate } = require('../utils/dateUtc');
const { formatFrDate } = require('../config/timezone');
const { notifyConsolidatorsPendingMission } = require('../services/projectConsolidator.service');
const { notifyMissionPendingCoordinatorReview } = require('../services/projectCoordinator.service');
const { pdfOnlyMulterFileFilter, wrapMulterUpload } = require('../utils/pdfUpload');

const router = express.Router();

async function canViewMission(mission, user, prisma) {
    if (canViewMissionForUser(mission, user)) return true;
    if (!prisma || !isPendingConsolidatorValidation(mission?.status)) return false;
    return canUserConsolidateEntity(prisma, user, mission, 'mission');
}

const missionsUploadDir = path.join(__dirname, '../../uploads/missions');
const uploadMissionFile = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(missionsUploadDir, { recursive: true });
            cb(null, missionsUploadDir);
        },
        filename(req, _file, cb) {
            cb(null, `${req.params.id}_${Date.now()}.pdf`);
        },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: pdfOnlyMulterFileFilter,
});

/** Confirme une mission (statut CONFIRMED + notification des intervenants). */
async function confirmMission(req, mission) {
    let fullMission = mission;
    if (!mission.assignments?.length || !mission.assignments[0]?.user) {
        fullMission = await req.prisma.mission.findUnique({
            where: { id: mission.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
    }
    const createdByName = fullMission.createdBy?.name || req.user?.name || 'Un utilisateur';
    const link = `/missions/${fullMission.id}`;
    for (const a of fullMission.assignments || []) {
        const u = a.user;
        if (!u?.email) continue;
        try {
            await notificationService.sendFullNotification(
                req.prisma,
                u.id,
                u.email,
                'MISSION_CREATED',
                'MISSION_CREATED',
                [u, { ...fullMission, startTime: fullMission.startTime, endTime: fullMission.endTime }, createdByName],
                'Nouvelle mission assignée',
                `Mission « ${fullMission.title} » le ${new Date(fullMission.startTime).toLocaleDateString('fr-FR')} à ${fullMission.location}.`,
                link,
            );
        } catch (err) {
            logger.warn('MISSION_NOTIFY_FAILED', err.message, { userId: u.id, missionId: fullMission.id });
        }
    }

    const updated = await req.prisma.mission.update({
        where: { id: fullMission.id },
        data: { status: 'CONFIRMED' },
    });

    logger.info('MISSION_CONFIRMED', `Mission confirmée « ${fullMission.title} »`, {
        missionId: fullMission.id,
        confirmedBy: req.user.id,
        assigneeCount: (fullMission.assignments || []).length,
    });

    await createAuditLog(req, 'MISSION_CONFIRMED', 'Mission', fullMission.id, `Mission « ${fullMission.title} » confirmée`);
    return updated;
}

async function notifyCreatorMissionProgress(req, mission, stage) {
    const creator = mission.createdBy;
    if (!creator?.email) return;
    const isCoordinated = stage === 'coordinated' || stage === 'consolidated';
    const notifType = isCoordinated ? 'MISSION_COORDINATED' : 'MISSION_CONFIRMED';
    const emailTemplate = isCoordinated ? 'MISSION_COORDINATED' : 'MISSION_CONFIRMED';
    const inAppTitle = isCoordinated
        ? `Mission validée (étape 1/2) : ${mission.title}`
        : `Mission confirmée : ${mission.title}`;
    const inAppBody = isCoordinated
        ? `Votre mission a été validée par ${req.user.name} (coordinateur). Elle attend la consolidation (étape 2/2).`
        : `Votre mission a été consolidée et confirmée par ${req.user.name}. Les intervenants ont été notifiés.`;
    try {
        await notificationService.sendFullNotification(
            req.prisma,
            creator.id,
            creator.email,
            notifType,
            emailTemplate,
            [creator, mission, req.user],
            inAppTitle,
            inAppBody,
            `/missions/${mission.id}`,
        );
    } catch (notifyErr) {
        logger.warn('MISSION_CREATOR_NOTIFY_FAILED', notifyErr.message, { missionId: mission.id, stage });
    }
}

/**
 * GET /api/missions - Liste des missions (créées par l'utilisateur ou où il est assigné)
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
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

        const whereParts = [missionListWhereForUser(req.user)];
        if (status) {
            whereParts.push({ status });
        } else {
            whereParts.push({ status: { not: 'CANCELLED' } });
        }
        if (from || to) {
            whereParts.push({ startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
        }
        if (directionId) whereParts.push({ directionId });
        if (projectId) whereParts.push({ projectId });
        if (contains) {
            whereParts.push({
                OR: [
                    { title: contains },
                    { description: contains },
                    { location: contains },
                    { direction: { is: { name: contains } } },
                    { direction: { is: { code: contains } } },
                    { project: { is: { name: contains } } },
                    { project: { is: { code: contains } } },
                ],
            });
        }
        const where = whereParts.length === 1 ? whereParts[0] : { AND: whereParts };

        const [missions, total] = await Promise.all([
            req.prisma.mission.findMany({
                where,
                include: {
                    createdBy: { select: { id: true, name: true, email: true, role: true } },
                    direction: { select: { id: true, name: true, code: true } },
                    project: { select: { ...PROJECT_WITH_RESPONSIBLE_SELECT, consolidatorId: true, coordinatorId: true } },
                    assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
                },
                orderBy: { startTime: 'desc' },
                skip,
                take: limit,
            }),
            req.prisma.mission.count({ where }),
        ]);
        const labeledMissions = missions.map((m) => attachStatusLabel(m, 'mission'));
        if (q || directionId || projectId || status || from || to || req.query.page || req.query.limit) {
            return res.json({
                items: labeledMissions,
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            });
        }
        return res.json(labeledMissions);
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
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                direction: { select: { id: true, name: true, code: true } },
                project: { select: { ...PROJECT_WITH_RESPONSIBLE_SELECT, consolidatorId: true, coordinatorId: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
                files: {
                    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
        if (!await canViewMission(mission, req.user, req.prisma)) return res.status(403).json({ error: 'Accès non autorisé' });
        const enriched = await attachMissionValidationWorkflow(req.prisma, mission);
        res.json(enriched);
    } catch (error) {
        logger.error('GET_MISSION', error.message, { missionId: req.params.id });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/missions - Créer une mission et notifier les intervenants
 * Seuls les Responsables (assistants de projet) et les Admins peuvent créer des missions.
 */
router.post('/', async (req, res) => {
    // Contrôle d'accès : RESPONSABLE, ADMIN, SUPER_ADMIN uniquement
    const creatorRole = req.user?.role;
    const allowedCreatorRoles = [ROLES.RESPONSABLE, ROLES.ASSISTANT, ROLES.ADMIN, ROLES.SUPER_ADMIN];
    if (!allowedCreatorRoles.includes(creatorRole)) {
        return res.status(403).json({
            error: 'Seuls les Responsables, les Assistants et les Administrateurs peuvent créer des missions.',
        });
    }
    try {
        const { title, description, location, startTime, endTime, userIds, directionId, projectId } = req.body || {};
        if (!title || !location || !startTime || !endTime) {
            return res.status(400).json({
                error: 'Titre, lieu, date de début et date de fin sont requis.',
            });
        }
        const start = parseUtcDate(startTime);
        const end = parseUtcDate(endTime);
        if (end <= start) {
            return res.status(400).json({ error: 'La fin doit être après le début.' });
        }
        if (directionId) {
            const d = await req.prisma.direction.findUnique({ where: { id: directionId }, select: { id: true } });
            if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
        }
        const projectCheck = await validateProjectForUserAction(req.prisma, req.user, projectId || null);
        if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
        const resolvedProjectId = projectCheck.value;
        let assistantResolution = null;
        try {
            assistantResolution = await resolveAssistantCreation(req.prisma, req.user, directionId || null);
        } catch (e) {
            return res.status(e.statusCode || 400).json({ error: e.message });
        }
        const initialStatus = assistantResolution
            ? assistantResolution.status
            : await resolveInitialResponsibleStatus(req.prisma, resolvedProjectId);
        const effectiveDirectionId = assistantResolution
            ? assistantResolution.directionId
            : (directionId || null);

        const mission = await req.prisma.mission.create({
            data: {
                title,
                description: description || null,
                location,
                startTime: start,
                endTime: end,
                directionId: effectiveDirectionId,
                projectId: resolvedProjectId || null,
                createdById: req.user.id,
                status: initialStatus,
                createdByRole: assistantResolution?.createdByRole || req.user.role || null,
            },
        });
        const assigneeIds = Array.isArray(userIds) ? [...new Set(userIds.filter((id) => id && id !== req.user.id))] : [];
        if (assigneeIds.length > 0) {
            await req.prisma.missionAssignment.createMany({
                data: assigneeIds.map((userId) => ({ missionId: mission.id, userId })),
                skipDuplicates: true,
            });
        }
        const missionWithRelations = await req.prisma.mission.findUnique({
            where: { id: mission.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                direction: { select: { id: true, name: true, code: true } },
                project: { select: PROJECT_WITH_RESPONSIBLE_SELECT },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        const link = `/missions/${mission.id}`;
        try {
            const creator = missionWithRelations.createdBy;
            if (assistantResolution) {
                await afterAssistantCreated(req.prisma, {
                    entityType: 'mission',
                    entity: missionWithRelations,
                    creator,
                    resolution: assistantResolution,
                });
            } else if (missionWithRelations.status === 'DRAFT') {
                await notifyMissionPendingCoordinatorReview(req.prisma, missionWithRelations, creator);
            } else {
                await notifyConsolidatorsPendingMission(req.prisma, missionWithRelations, creator);
            }
            if (creator?.email) {
                const pendingMsg = assistantResolution?.autoApproved
                    ? 'Statut : validée automatiquement (aucun DG sur votre direction) — publiée au calendrier.'
                    : assistantResolution
                      ? 'Statut : en attente de validation du DG de votre direction.'
                      : missionWithRelations.status === 'DRAFT'
                    ? 'Statut : en attente du coordinateur du projet (étape 1/2).'
                    : 'Statut : en attente de consolidation (étape 2/2) — coordinateur non désigné sur le projet.';
                await notificationService.sendFullNotification(
                    req.prisma,
                    req.user.id,
                    creator.email,
                    'MISSION_CREATED_CONFIRMATION',
                    'MISSION_CREATED_CONFIRMATION',
                    [creator, missionWithRelations, missionWithRelations.assignments.length, pendingMsg],
                    'Mission créée',
                    `Votre mission « ${mission.title} » a été enregistrée.`,
                    link,
                );
            }
        } catch (notifyErr) {
            logger.warn('MISSION_CREATOR_NOTIFY_FAILED', notifyErr.message, { missionId: mission.id });
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
        const { title, description, location, startTime, endTime, userIds, directionId, projectId, status } = req.body || {};
        const data = {};
        if (status != null && isPrivilegedAdmin(req.user?.role)) {
            const nextStatus = String(status).trim();
            // CONFIRMED doit toujours passer par le circuit coordinateur → consolidateur (pas de raccourci, même admin).
            if (nextStatus === 'CANCELLED') {
                data.status = nextStatus;
            }
        }
        if (title != null) data.title = title;
        if (description != null) data.description = description;
        if (location != null) data.location = location;
        if (startTime != null) data.startTime = parseUtcDate(startTime);
        if (endTime != null) data.endTime = parseUtcDate(endTime);
        if (directionId !== undefined) {
            if (directionId) {
                const d = await req.prisma.direction.findUnique({ where: { id: directionId }, select: { id: true } });
                if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
            }
            data.directionId = directionId || null;
        }
        if (projectId !== undefined) {
            const projectCheck = await validateProjectForUserAction(
                req.prisma,
                req.user,
                projectId || null,
                { requiredForResponsable: false },
            );
            if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
            data.projectId = projectCheck.value;
        } else if (isResponsable(req.user?.role) && mission.projectId) {
            const projectCheck = await validateProjectForUserAction(req.prisma, req.user, mission.projectId);
            if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
        }
        const timeChanged = (startTime != null && parseUtcDate(startTime).getTime() !== new Date(mission.startTime).getTime())
            || (endTime != null && parseUtcDate(endTime).getTime() !== new Date(mission.endTime).getTime());
        const contentChanged = title !== undefined
            || description !== undefined
            || location !== undefined
            || timeChanged
            || projectId !== undefined
            || Array.isArray(userIds);
        if (Object.keys(data).length) {
            await req.prisma.mission.update({ where: { id: req.params.id }, data });
        }
        if (Array.isArray(userIds)) {
            const newIds = [...new Set(userIds.filter((id) => id))];
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
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                direction: { select: { id: true, name: true, code: true } },
                project: { select: PROJECT_WITH_RESPONSIBLE_SELECT },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        const createdByName = updated?.createdBy?.name || 'Un utilisateur';
        const link = `/missions/${updated.id}`;
        if (updated.status === 'CONFIRMED') {
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
                        link,
                    );
                } catch (err) {
                    logger.warn('MISSION_UPDATE_NOTIFY_FAILED', err.message, { userId: u.id, missionId: updated.id });
                }
            }
        }
        await createAuditLog(req, 'MISSION_UPDATED', 'Mission', req.params.id, `Mission ${updated.title} modifiée`);

        try {
            if (updated.status === 'DRAFT' && contentChanged) {
                await startMissionValidation(req.prisma, updated, updated.createdBy);
            } else if (isPendingConsolidatorValidation(updated.status) && contentChanged) {
                await notifyConsolidatorsPendingMission(req.prisma, updated, updated.createdBy);
            }
        } catch (notifyErr) {
            logger.warn('MISSION_CONSOLIDATOR_NOTIFY_FAILED', notifyErr.message, { missionId: updated.id });
        }

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

        const permanent = isPrivilegedAdmin(req.user?.role) && ['1', 'true'].includes(String(req.query.permanent || ''));
        if (permanent) {
            await req.prisma.mission.delete({ where: { id: req.params.id } });
            await createAuditLog(req, 'MISSION_DELETED', 'Mission', req.params.id, `Mission ${mission.title} supprimée définitivement (super admin)`);
            return res.json({ success: true, permanent: true });
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
 * POST /api/missions/:id/participants - Ajouter des intervenants (sans blocage de conflit de créneau)
 */
router.post('/:id/participants', async (req, res) => {
    try {
        const { userIds } = req.body || {};
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'Liste userIds requise' });
        }

        const mission = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { name: true } },
                assignments: true,
            },
        });

        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
        if (!canEditMission(mission, req.user)) {
            return res.status(403).json({ error: 'Seul le créateur ou un administrateur peut ajouter des intervenants' });
        }
        if (mission.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Impossible d\'ajouter des intervenants à une mission annulée' });
        }

        const existingIds = new Set(mission.assignments.map((a) => a.userId));
        const toAdd = [...new Set(userIds.filter((uid) => uid && !existingIds.has(uid) && uid !== mission.createdById))];

        if (toAdd.length === 0) {
            return res.status(400).json({ error: 'Aucun nouvel intervenant à ajouter' });
        }

        await req.prisma.missionAssignment.createMany({
            data: toAdd.map((userId) => ({ missionId: mission.id, userId })),
            skipDuplicates: true,
        });

        const newUsers = await req.prisma.user.findMany({
            where: { id: { in: toAdd } },
            select: { id: true, name: true, email: true },
        });
        const createdByName = mission.createdBy?.name || req.user?.name || 'Un utilisateur';
        const link = `/missions/${mission.id}`;
        if (mission.status === 'CONFIRMED') {
            for (const u of newUsers) {
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
                        link,
                    );
                } catch (err) {
                    logger.warn('MISSION_PARTICIPANT_NOTIFY_FAILED', err.message, { userId: u.id, missionId: mission.id });
                }
            }
        }

        await createAuditLog(req, 'MISSION_PARTICIPANTS_ADDED', 'Mission', mission.id, `${toAdd.length} intervenant(s) ajouté(s)`);
        res.json({ success: true, added: toAdd.length });
    } catch (error) {
        logger.error('ADD_MISSION_PARTICIPANTS', error.message, { missionId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/missions/:id/files - Ajouter un PDF (pièce jointe)
 */
router.post('/:id/files', wrapMulterUpload(uploadMissionFile.single('file')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier envoyé. Utilisez le champ "file".' });
        }
        const mission = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: { assignments: true },
        });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });

        if (!await canViewMission(mission, req.user, req.prisma)) return res.status(403).json({ error: 'Accès non autorisé' });

        const kind = 'DOCUMENT';
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

/** 2e palier : consolidation (consolidateur projet → direction → global). */
router.put('/:id/approve', async (req, res) => {
    try {
        const mission = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                project: { select: { id: true, name: true, consolidatorId: true, coordinatorId: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });

        if (isPrivilegedAdmin(req.user?.role)) {
            if (mission.status === 'DRAFT') {
                return res.status(400).json({
                    error: 'Étape 1/2 obligatoire : validation coordinateur avant consolidation et confirmation.',
                });
            }
            if (isPendingConsolidatorValidation(mission.status)) {
                const updated = await confirmMission(req, mission);
                await notifyCreatorMissionProgress(req, mission, 'published');
                await createAuditLog(
                    req,
                    'MISSION_APPROVED',
                    'Mission',
                    mission.id,
                    `Mission « ${mission.title} » confirmée (admin, étape 2/2)`,
                );
                return res.json(updated);
            }
            if (isPendingCoordinatorValidation(mission.status)) {
                const updated = await confirmMission(req, mission);
                await notifyCreatorMissionProgress(req, mission, 'published');
                await createAuditLog(
                    req,
                    'MISSION_APPROVED',
                    'Mission',
                    mission.id,
                    `Mission « ${mission.title} » confirmée (admin, legacy)`,
                );
                return res.json(updated);
            }
            return res.status(400).json({ error: 'Cette mission ne peut pas être validée à cette étape.' });
        }

        if (isPendingConsolidatorValidation(mission.status)) {
            if (!await canUserConsolidateEntity(req.prisma, req.user, mission, 'mission')) {
                return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à consolider cette mission.' });
            }
            const updated = await confirmMission(req, mission);
            await notifyCreatorMissionProgress(req, mission, 'published');
            await createAuditLog(req, 'MISSION_APPROVED', 'Mission', mission.id, `Mission « ${mission.title} » consolidée et confirmée`);
            return res.json(updated);
        }

        return res.status(400).json({ error: 'Cette mission n\'est pas en attente de consolidation.' });
    } catch (error) {
        logger.error('APPROVE_MISSION', error.message, { missionId: req.params.id });
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/** 1er palier : validation coordinateur (DRAFT -> CONSOLIDATOR_PENDING) ou legacy finalize. */
router.put('/:id/approve-coordinator', async (req, res) => {
    try {
        const mission = await req.prisma.mission.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                project: { select: { id: true, name: true, consolidatorId: true, coordinatorId: true } },
                assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });
        if (!mission) return res.status(404).json({ error: 'Mission introuvable' });

        if (mission.status === 'DRAFT') {
            if (!canCoordinateDraftMission(mission, req.user)) {
                return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider cette mission à ce palier.' });
            }
            const updated = await req.prisma.mission.update({
                where: { id: mission.id },
                data: { status: MEETING_PENDING_FINAL },
            });
            await notifyConsolidatorsPendingMission(req.prisma, mission, mission.createdBy);
            await notifyCreatorMissionProgress(req, mission, 'coordinated');
            await createAuditLog(
                req,
                'MISSION_COORDINATED',
                'Mission',
                mission.id,
                `Mission « ${mission.title} » validée par le coordinateur — attente consolidation`,
            );
            return res.json(updated);
        }

        if (isPendingCoordinatorValidation(mission.status)) {
            if (!canFinalizePendingMission(mission, req.user)) {
                return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider définitivement cette mission.' });
            }
            const updated = await confirmMission(req, mission);
            await notifyCreatorMissionProgress(req, mission, 'published');
            await createAuditLog(req, 'MISSION_APPROVED', 'Mission', mission.id, `Mission « ${mission.title} » validée définitivement (legacy)`);
            return res.json(updated);
        }

        return res.status(400).json({ error: 'Cette mission n\'est pas en attente de validation coordinateur.' });
    } catch (error) {
        logger.error('APPROVE_MISSION_COORDINATOR', error.message, { missionId: req.params.id });
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
});

module.exports = router;
