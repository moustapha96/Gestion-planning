const express = require('express');
const { z } = require('zod');
const roleMiddleware = require('../middlewares/role.middleware');
const { notificationService } = require('../services/notification.service');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();
const { ROLES, ADMIN_ROUTE_ROLES, isPrivilegedAdmin, planningScopeWhere, isResponsable } = require('../config/roles');
const {
    COORDINATOR_PENDING,
    STATUS_AFTER_CONSOLIDATION,
    isPendingCoordinatorValidation,
} = require('../config/planningWorkflow');
const { resolvePlanningEventTypeFields } = require('../services/eventType.service');
const {
    notifyPlanningPendingConsolidation,
    canUserConsolidatePlanning,
    attachPlanningValidationProject,
    formatPlanningWeekLabel,
} = require('../services/projectConsolidator.service');
const { validateProjectForUserAction } = require('../services/projectResponsible.service');
const {
    canUserCoordinatePlanning,
    coordinatorApproveBlockingReason,
    canUserReturnPlanning,
    notifyCoordinatorPlanningPending,
} = require('../services/projectCoordinator.service');
const {
    canAutoFinalizeAfterConsolidation,
    enrichPlanningForUser,
    enrichPlanningsForUser,
} = require('../services/planningValidation.service');
const {
    enrichPlanningWithAggregation,
    enrichPlanningsWithAggregation,
    ensureWeekPlanningsForResponsibles,
    ensurePlanningForResponsible,
} = require('../services/planningAggregation.service');

/** N'interrompt pas le workflow si l'e-mail ou la notification échoue. */
async function safeNotify(label, fn) {
    try {
        await fn();
    } catch (err) {
        logger.warn(label, err.message);
    }
}
const PLANNING_EVENT_INCLUDE = {
    room: { select: { id: true, name: true } },
    direction: { select: { id: true, name: true, code: true } },
    project: { select: { id: true, name: true, code: true } },
    eventType: { select: { id: true, name: true, code: true, color: true } },
};

/**
 * @swagger
 * tags:
 *   name: Plannings
 *   description: Gestion des plannings hebdomadaires
 */

/**
 * @swagger
 * /api/plannings/week/{date}:
 *   get:
 *     summary: Récupérer les plannings d'une semaine
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Une date dans la semaine souhaitée (ex. 2026-03-09)
 *     responses:
 *       200:
 *         description: Liste des plannings de la semaine
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Planning'
 *                   - type: object
 *                     properties:
 *                       user:
 *                         $ref: '#/components/schemas/User'
 *                       events:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/PlanningEvent'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// Retourne le lundi 00:00:00 de la semaine contenant la date (dimanche = semaine suivante, comme en GET)
function getMondayOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function planningWeekLabel(dateValue) {
    try {
        return new Date(dateValue).toISOString().slice(0, 10);
    } catch {
        return '';
    }
}

router.get('/week/:date', async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const weekStart = getMondayOfWeek(date);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        await ensureWeekPlanningsForResponsibles(req.prisma, weekStart);

        const scope = planningScopeWhere(req.user);
        const where = {
            weekStart: { gte: weekStart, lt: weekEnd },
            ...scope,
        };
        if (req.query.mine === '1' && req.user?.id && !scope.userId) {
            where.userId = req.user.id;
        }

        const plannings = await req.prisma.planning.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        projectId: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                responsibleId: true,
                                consolidatorId: true,
                                coordinatorId: true,
                                responsible: { select: { id: true, name: true, email: true } },
                            },
                        },
                    },
                },
                events: { include: PLANNING_EVENT_INCLUDE },
                _count: { select: { events: true } },
            },
            orderBy: [{ user: { name: 'asc' } }, { weekStart: 'asc' }],
        });

        const aggregated = await enrichPlanningsWithAggregation(req.prisma, plannings);
        const enriched = await enrichPlanningsForUser(req.prisma, aggregated, req.user);
        res.json(enriched);
    } catch (error) {
        logger.error('GET_PLANNINGS_WEEK', 'Erreur récupération plannings semaine', {
            date: req.params.date,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/** LISTE ADMIN — tous les plannings (filtres + pagination) */
router.get('/admin/list', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (req.query.status) where.status = req.query.status;
        if (req.query.userId) where.userId = req.query.userId;
        if (req.query.weekFrom || req.query.weekTo) {
            where.weekStart = {};
            if (req.query.weekFrom) where.weekStart.gte = new Date(req.query.weekFrom);
            if (req.query.weekTo) where.weekStart.lte = new Date(req.query.weekTo);
        }

        const [items, total] = await Promise.all([
            req.prisma.planning.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                    _count: { select: { events: true } },
                },
                orderBy: [{ weekStart: 'desc' }, { createdAt: 'desc' }],
            }),
            req.prisma.planning.count({ where }),
        ]);

        res.json({ items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
    } catch (error) {
        logger.error('ADMIN_LIST_PLANNINGS', error.message);
        res.status(400).json({ error: error.message });
    }
});

/** Création par admin pour un utilisateur */
router.post('/admin/create', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const { userId, weekStart } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId requis' });
        const user = await req.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        const weekStartNorm = getMondayOfWeek(weekStart ? new Date(weekStart) : new Date());
        const existing = await req.prisma.planning.findUnique({
            where: { userId_weekStart: { userId, weekStart: weekStartNorm } },
        });
        if (existing) {
            return res.status(409).json({ error: 'Un planning existe déjà pour cet utilisateur cette semaine.', planningId: existing.id });
        }
        const planning = await req.prisma.planning.create({
            data: {
                userId,
                weekStart: weekStartNorm,
                status: 'VALIDATED',
                validatedAt: new Date(),
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        await createAuditLog(req, 'PLANNING_ADMIN_CREATE', 'Planning', planning.id, `Planning créé par admin pour ${user.email}`);
        res.status(201).json(planning);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Planning déjà existant pour cette semaine.' });
        res.status(400).json({ error: error.message });
    }
});

/** Soumission par admin (brouillon ou retourné → soumis) — redondant avec PUT /submit en tant qu’admin */
router.put('/:id/admin-submit', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    include: {
                        project: { select: { id: true, name: true, code: true, consolidatorId: true, coordinatorId: true } },
                    },
                },
            },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (!['DRAFT', 'RETURNED'].includes(planning.status)) {
            return res.status(400).json({ error: 'Seul un brouillon ou un planning retourné peut être soumis.' });
        }
        await attachPlanningValidationProject(req.prisma, planning);
        const project = planning.user?.project;
        const skipConsolidator = project && !project.consolidatorId;
        const nextStatus = skipConsolidator && project?.coordinatorId
            ? STATUS_AFTER_CONSOLIDATION
            : 'SUBMITTED';
        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: {
                status: nextStatus,
                submittedAt: new Date(),
                ...(nextStatus === STATUS_AFTER_CONSOLIDATION ? { consolidatedAt: new Date() } : {}),
            },
            include: {
                events: { include: PLANNING_EVENT_INCLUDE },
            },
        });
        await createAuditLog(req, 'PLANNING_SUBMITTED', 'Planning', req.params.id, `Soumission admin`);
        await notifyPlanningPendingConsolidation(req.prisma, {
            projectId: planning.user?.projectId,
            ownerUserId: planning.userId,
            ownerName: planning.user?.name,
            planningId: req.params.id,
            weekStart: planning.weekStart,
            projectName: planning.user?.project?.name,
        });
        await notificationService.createNotification(
            req.prisma, planning.userId, 'PLANNING_SUBMITTED', 'Planning soumis', 'Votre planning a été soumis par l\'administration.', `/planning/${req.params.id}`
        );
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/plannings/{id}:
 *   get:
 *     summary: Récupérer le détail d'un planning
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détail du planning
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Planning'
 *                 - type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PlanningEvent'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/:id', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                responsibleId: true,
                                consolidatorId: true,
                                coordinatorId: true,
                                responsible: { select: { id: true, name: true, email: true } },
                                consolidator: { select: { id: true, name: true, email: true } },
                                coordinator: { select: { id: true, name: true, email: true } },
                            },
                        },
                    },
                },
                events: { include: PLANNING_EVENT_INCLUDE },
            },
        });

        if (!planning) {
            return res.status(404).json({ error: 'Planning introuvable' });
        }

        await attachPlanningValidationProject(req.prisma, planning);

        if (!canUserViewPlanning(planning, req.user)) {
            return res.status(403).json({ error: 'Accès non autorisé à ce planning' });
        }

        const weekStart = new Date(planning.weekStart);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const aggregated = await enrichPlanningWithAggregation(req.prisma, planning);
        const enriched = await enrichPlanningForUser(req.prisma, aggregated, req.user);
        res.json(enriched);
    } catch (error) {
        logger.error('GET_PLANNING', 'Erreur récupération planning', {
            planningId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/plannings:
 *   post:
 *     summary: Créer un nouveau planning
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weekStart]
 *             properties:
 *               weekStart:
 *                 type: string
 *                 format: date-time
 *                 description: Date de début de semaine (lundi)
 *     responses:
 *       200:
 *         description: Planning créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Planning'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', async (req, res) => {
    try {
        const { weekStart } = req.body;
        const weekStartNorm = getMondayOfWeek(weekStart ? new Date(weekStart) : new Date());

        const existing = await req.prisma.planning.findUnique({
            where: {
                userId_weekStart: { userId: req.user.id, weekStart: weekStartNorm },
            },
        });
        if (existing) {
            return res.status(409).json({
                error: 'Un planning existe déjà pour cette semaine.',
                planningId: existing.id,
            });
        }

        const planning = await req.prisma.planning.create({
            data: {
                userId: req.user.id,
                weekStart: weekStartNorm,
                status: 'VALIDATED',
                validatedAt: new Date(),
            },
        });

        logger.info('PLANNING_CREATED', `Planning créé par ${req.user.id}`, {
            planningId: planning.id,
            userId: req.user.id,
            weekStart: weekStartNorm.toISOString(),
        });

        res.status(201).json(planning);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Un planning existe déjà pour cette semaine.' });
        }
        logger.error('CREATE_PLANNING', 'Erreur création planning', {
            userId: req.user.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/plannings/{id}:
 *   put:
 *     summary: Mettre à jour un planning (brouillon uniquement)
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PlanningEvent'
 *     responses:
 *       200:
 *         description: Planning mis à jour
 *       403:
 *         description: Non autorisé ou planning non modifiable
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/:id', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        const isAdmin = isPrivilegedAdmin(req.user.role);
        const isOwner = planning.userId === req.user.id;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Cannot modify planning' });
        }
        const metaOk =
            (isOwner && planning.status === 'DRAFT') ||
            (isAdmin && ['DRAFT', 'RETURNED'].includes(planning.status));
        if (!metaOk) {
            return res.status(403).json({ error: 'Modification non autorisée pour ce statut.' });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: req.body,
            include: {
                events: { include: PLANNING_EVENT_INCLUDE },
            },
        });

        res.json(updated);
    } catch (error) {
        logger.error('UPDATE_PLANNING', 'Erreur mise à jour planning', {
            planningId: req.params.id,
            userId: req.user.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/plannings/{id}/submit:
 *   put:
 *     summary: Soumettre un planning pour consolidation
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planning soumis avec succès
 *       403:
 *         description: Non autorisé
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/:id/submit', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    include: {
                        project: { select: { id: true, name: true, code: true, consolidatorId: true, coordinatorId: true } },
                    },
                },
            },
        });
        const isAdmin = isPrivilegedAdmin(req.user.role);
        if (planning.userId !== req.user.id && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (!['DRAFT', 'RETURNED'].includes(planning.status)) {
            return res.status(400).json({ error: 'Seuls les brouillons ou plannings retournés peuvent être soumis à nouveau.' });
        }

        await attachPlanningValidationProject(req.prisma, planning);
        const project = planning.user?.project;
        const skipConsolidator = project && !project.consolidatorId;
        const nextStatus = skipConsolidator && project?.coordinatorId
            ? STATUS_AFTER_CONSOLIDATION
            : 'SUBMITTED';

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: {
                status: nextStatus,
                submittedAt: new Date(),
                ...(nextStatus === STATUS_AFTER_CONSOLIDATION ? { consolidatedAt: new Date() } : {}),
            },
            include: {
                events: { include: PLANNING_EVENT_INCLUDE },
            },
        });

        logger.info('PLANNING_SUBMITTED', `Planning soumis par ${req.user.name}`, {
            planningId: req.params.id,
            userId: req.user.id,
            byAdmin: isAdmin,
            nextStatus,
        });

        await createAuditLog(
            req,
            'PLANNING_SUBMITTED',
            'Planning',
            req.params.id,
            isAdmin
                ? `Planning ${req.params.id} soumis par l'administration (responsable: ${planning.userId})`
                : `Planning ${req.params.id} soumis`
        );

        if (nextStatus === STATUS_AFTER_CONSOLIDATION && planning.user?.projectId) {
            await notifyCoordinatorPlanningPending(req.prisma, {
                projectId: planning.user.projectId,
                ownerUserId: planning.userId,
                ownerName: planning.user?.name,
                planningId: req.params.id,
                weekStart: planning.weekStart,
                projectName: planning.user?.project?.name,
            });
        } else {
            await notifyPlanningPendingConsolidation(req.prisma, {
                projectId: planning.user?.projectId,
                ownerUserId: planning.userId,
                ownerName: planning.user?.name,
                planningId: req.params.id,
                weekStart: planning.weekStart,
                projectName: planning.user?.project?.name,
            });
        }

        let ownerMsg;
        if (nextStatus === STATUS_AFTER_CONSOLIDATION) {
            ownerMsg = isAdmin
                ? 'Votre planning a été soumis par l\'administration et transmis au coordinateur du projet (pas de consolidateur sur ce projet).'
                : 'Votre planning a été soumis et transmis directement au coordinateur du projet.';
        } else if (skipConsolidator && !project?.coordinatorId) {
            ownerMsg = isAdmin
                ? 'Votre planning a été soumis par l\'administration et est en attente de validation par un consolidateur (rôle).'
                : 'Votre planning a été soumis et est en attente de validation par un consolidateur (rôle).';
        } else {
            ownerMsg = isAdmin
                ? 'Votre planning a été soumis par l\'administration et est en attente de consolidation.'
                : 'Votre planning a été soumis avec succès et est en attente de consolidation';
        }
        const weekLabel = formatPlanningWeekLabel(planning.weekStart);
        if (planning.user?.email) {
            await notificationService.sendFullNotification(
                req.prisma,
                planning.userId,
                planning.user.email,
                'PLANNING_SUBMITTED',
                'PLANNING_SUBMITTED',
                [planning.user, req.params.id, ownerMsg, weekLabel],
                'Planning soumis',
                ownerMsg,
                `/plannings/${req.params.id}`,
            );
        } else {
            await notificationService.createNotification(
                req.prisma,
                planning.userId,
                'PLANNING_SUBMITTED',
                'Planning soumis',
                ownerMsg,
                `/plannings/${req.params.id}`,
            );
        }

        res.json(updated);
    } catch (error) {
        logger.error('SUBMIT_PLANNING', 'Erreur soumission planning', {
            planningId: req.params.id,
            userId: req.user.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/plannings/{id}/consolidate:
 *   put:
 *     summary: Consolider un planning (CONSOLIDATEUR uniquement)
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planning consolidé
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/:id/consolidate', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                consolidatorId: true,
                                coordinatorId: true,
                            },
                        },
                    },
                },
                events: { select: { projectId: true } },
            },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        await attachPlanningValidationProject(req.prisma, planning);
        const allowed = await canUserConsolidatePlanning(req.prisma, req.user, planning);
        if (!allowed) {
            return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à consolider ce planning.' });
        }
        if (planning.status !== 'SUBMITTED') {
            return res.status(400).json({ error: 'Seul un planning au statut « soumis » peut être consolidé.' });
        }

        const project = planning.user?.project;
        const autoFinalize = canAutoFinalizeAfterConsolidation(project, req.user);
        const resolvedProjectId = project?.id || planning.user?.projectId;

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: {
                status: autoFinalize ? 'VALIDATED' : STATUS_AFTER_CONSOLIDATION,
                consolidatedAt: new Date(),
                ...(autoFinalize ? { validatedAt: new Date() } : {}),
            },
        });

        logger.info(
            autoFinalize ? 'PLANNING_CONSOLIDATED_AND_VALIDATED' : 'PLANNING_CONSOLIDATED',
            autoFinalize
                ? `Planning consolidé et validé par ${req.user.id}`
                : `Planning consolidé par ${req.user.id}`,
            { planningId: req.params.id, consolidatorId: req.user.id, autoFinalize },
        );

        await createAuditLog(
            req,
            autoFinalize ? 'PLANNING_VALIDATED' : 'PLANNING_CONSOLIDATED',
            'Planning',
            req.params.id,
            autoFinalize
                ? `Planning ${req.params.id} consolidé et validé (même acteur)`
                : `Planning ${req.params.id} consolidé`,
        );

        const weekLabel = formatPlanningWeekLabel(planning.weekStart);

        if (autoFinalize) {
            await safeNotify('PLANNING_VALIDATED_NOTIFY', () => notificationService.sendFullNotification(
                req.prisma,
                planning.userId,
                planning.user?.email,
                'PLANNING_VALIDATED',
                'PLANNING_VALIDATED',
                [planning.user, req.params.id, req.user, weekLabel, project?.name],
                'Planning validé et publié',
                `Votre planning a été consolidé et validé par ${req.user.name} et est maintenant publié.`,
                `/plannings/${req.params.id}`,
            ));
        } else if (resolvedProjectId) {
            await safeNotify('PLANNING_COORDINATOR_PENDING_NOTIFY', () => notifyCoordinatorPlanningPending(req.prisma, {
                projectId: resolvedProjectId,
                ownerUserId: planning.userId,
                ownerName: planning.user?.name,
                planningId: req.params.id,
                weekStart: planning.weekStart,
                projectName: project?.name,
            }));

            const ownerInApp = 'Votre planning a été consolidé et attend la validation finale (coordinateur ou rôle dédié) avant publication.';
            await safeNotify('PLANNING_CONSOLIDATED_NOTIFY', async () => {
                if (planning.user?.email) {
                    await notificationService.sendFullNotification(
                        req.prisma,
                        planning.userId,
                        planning.user.email,
                        'PLANNING_CONSOLIDATED',
                        'PLANNING_CONSOLIDATED',
                        [planning.user, req.params.id, weekLabel, project?.name, req.user],
                        'Planning consolidé',
                        ownerInApp,
                        `/plannings/${req.params.id}`,
                    );
                } else {
                    await notificationService.createNotification(
                        req.prisma,
                        planning.userId,
                        'PLANNING_IN_CONSOLIDATION',
                        'Planning consolidé',
                        ownerInApp,
                        `/plannings/${req.params.id}`,
                    );
                }
            });
        }

        res.json({ ...updated, autoFinalized: autoFinalize });
    } catch (error) {
        logger.error('CONSOLIDATE_PLANNING', 'Erreur consolidation planning', {
            planningId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/** Validation par le coordinateur de projet désigné (planning, missions, réunions — chaîne simplifiée). */
async function handleCoordinatorApprove(req, res) {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                                consolidatorId: true,
                                coordinatorId: true,
                            },
                        },
                    },
                },
                events: { select: { projectId: true } },
            },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });

        await attachPlanningValidationProject(req.prisma, planning);

        const statusBlock = coordinatorApproveBlockingReason(planning);
        if (statusBlock) {
            return res.status(400).json({ error: statusBlock });
        }

        const allowed = await canUserCoordinatePlanning(req.prisma, req.user, planning);
        if (!allowed) {
            return res.status(403).json({ error: 'Seul le coordinateur du projet désigné peut valider ce planning.' });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: 'VALIDATED', validatedAt: new Date() },
        });

        await createAuditLog(
            req,
            'PLANNING_VALIDATED',
            'Planning',
            req.params.id,
            `Planning validé par le coordinateur de projet (${req.user.id})`,
        );

        const weekLabel = formatPlanningWeekLabel(planning.weekStart);
        await safeNotify('PLANNING_VALIDATED_NOTIFY', () => notificationService.sendFullNotification(
            req.prisma,
            planning.userId,
            planning.user?.email,
            'PLANNING_VALIDATED',
            'PLANNING_VALIDATED',
            [planning.user, req.params.id, req.user, weekLabel, planning.user?.project?.name],
            'Planning validé et publié',
            `Votre planning a été validé définitivement par ${req.user.name} et est maintenant publié.`,
            `/plannings/${req.params.id}`,
        ));

        res.json(updated);
    } catch (error) {
        logger.error('COORDINATOR_APPROVE_PLANNING', error.message, { planningId: req.params.id });
        res.status(400).json({ error: error.message });
    }
}

router.put('/:id/approve-coordinator', handleCoordinatorApprove);
/** Alias historiques */
router.put('/:id/approve-cp', handleCoordinatorApprove);
router.put('/:id/approve-sg', handleCoordinatorApprove);

/**
 * @swagger
 * /api/plannings/{id}/validate:
 *   put:
 *     summary: Valider définitivement un planning (SG ou DG après l’accord SG/DG ; admin peut court-circuiter)
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planning validé
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/:id/validate', async (req, res) => {
    if (isPrivilegedAdmin(req.user.role)) {
        try {
            const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    include: {
                        project: { select: { id: true, name: true, code: true, consolidatorId: true, coordinatorId: true } },
                    },
                },
            },
        });
            if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
            if (!isPendingCoordinatorValidation(planning.status) && planning.status !== 'SUBMITTED') {
                return res.status(400).json({ error: 'Statut incompatible avec la validation admin.' });
            }
            const updated = await req.prisma.planning.update({
                where: { id: req.params.id },
                data: { status: 'VALIDATED', validatedAt: new Date() },
            });
            await createAuditLog(req, 'PLANNING_VALIDATED', 'Planning', req.params.id, 'Validation admin');
            const weekLabel = formatPlanningWeekLabel(planning.weekStart);
            if (planning.user?.email) {
                await notificationService.sendFullNotification(
                    req.prisma,
                    planning.userId,
                    planning.user.email,
                    'PLANNING_VALIDATED',
                    'PLANNING_VALIDATED',
                    [planning.user, req.params.id, req.user, weekLabel, planning.user?.project?.name],
                    'Planning validé et publié',
                    `Votre planning a été validé par l'administration (${req.user.name}) et est maintenant publié.`,
                    `/plannings/${req.params.id}`,
                );
            }
            res.json(updated);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
        return;
    }
    return handleCoordinatorApprove(req, res);
});

/**
 * @swagger
 * /api/plannings/{id}/return:
 *   put:
 *     summary: Retourner un planning pour correction (secrétaire général, DG ou admin)
 *     tags: [Plannings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comment]
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Commentaire expliquant les corrections demandées
 *     responses:
 *       200:
 *         description: Planning retourné pour correction
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/:id/return', async (req, res) => {
    try {
        const { comment } = req.body;

        const existing = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: {
                user: { include: { project: true } },
                events: { select: { projectId: true } },
            },
        });
        if (!existing) return res.status(404).json({ error: 'Planning introuvable' });
        await attachPlanningValidationProject(req.prisma, existing);
        const canReturn = await canUserReturnPlanning(req.prisma, req.user, existing);
        if (!canReturn) {
            return res.status(403).json({ error: 'Retour non autorisé pour ce planning.' });
        }
        if (!isPendingCoordinatorValidation(existing.status)) {
            return res.status(400).json({
                error: 'Seuls les plannings en attente du coordinateur de projet peuvent être retournés.',
            });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: 'RETURNED', returnComment: comment, returnedAt: new Date() },
        });

        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });

        logger.info('PLANNING_RETURNED', `Planning retourné par ${req.user.id}`, {
            planningId: req.params.id,
            returnedById: req.user.id,
            ownerId: planning.userId,
        });

        await createAuditLog(req, 'PLANNING_RETURNED', 'Planning', req.params.id, `Planning ${req.params.id} retourné`);

        await safeNotify('PLANNING_RETURNED_NOTIFY', () => notificationService.sendFullNotification(
            req.prisma,
            planning.userId,
            planning.user.email,
            'PLANNING_RETURNED',
            'PLANNING_RETURNED',
            [planning.user, comment, req.params.id],
            'Planning retourné',
            `Votre planning doit être modifié : ${comment}`,
            `/plannings/${req.params.id}`,
        ));

        res.json(updated);
    } catch (error) {
        logger.error('RETURN_PLANNING', 'Erreur retour planning', {
            planningId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id/cancel', roleMiddleware([ROLES.ADMIN, ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (planning.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Ce planning est déjà annulé.' });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
        });

        await createAuditLog(req, 'PLANNING_CANCELLED', 'Planning', req.params.id, `Planning ${req.params.id} annulé par admin`);

        await notificationService.createNotification(
            req.prisma,
            planning.userId,
            'PLANNING_CANCELLED',
            'Planning annulé',
            `Votre planning (semaine du ${planningWeekLabel(planning.weekStart)}) a été annulé par l'administration.`,
            `/planning/${req.params.id}`
        );

        res.json(updated);
    } catch (error) {
        logger.error('CANCEL_PLANNING', 'Erreur annulation planning', {
            planningId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/plannings/:id — Supprimer un planning (créateur si brouillon, ou ADMIN)
 */
router.delete('/:id', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({ where: { id: req.params.id } });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });

        const isAdmin = isPrivilegedAdmin(req.user.role);
        const isOwner = planning.userId === req.user.id;

        if (isOwner && planning.status === 'DRAFT') {
            // Le créateur peut supprimer son brouillon
        } else if (isAdmin) {
            // L'admin peut supprimer n'importe quel planning
        } else {
            return res.status(403).json({
                error: 'Seul le créateur peut supprimer un brouillon, ou un administrateur peut supprimer tout planning.',
            });
        }

        await req.prisma.planning.delete({ where: { id: req.params.id } });

        await createAuditLog(req, 'PLANNING_DELETED', 'Planning', req.params.id, `Planning supprimé (semaine du ${planning.weekStart.toISOString().slice(0, 10)})`);

        logger.info('PLANNING_DELETED', `Planning ${req.params.id} supprimé par ${req.user.id}`);

        res.json({ success: true });
    } catch (error) {
        logger.error('DELETE_PLANNING', 'Erreur suppression planning', {
            planningId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

const editableEventStatuses = ['DRAFT', 'RETURNED', 'VALIDATED', 'SUBMITTED', 'IN_CONSOLIDATION', 'CP_PENDING', 'SG_PENDING', 'DG_PENDING'];

function canManagePlanningEvents(planning, user) {
    if (planning.status === 'CANCELLED') return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return planning.userId === user.id;
}

// POST /:id/events — responsable (brouillon/retour) ou ADMIN (tout statut)
router.post('/:id/events', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({ where: { id: req.params.id } });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (!canManagePlanningEvents(planning, req.user)) {
            return res.status(403).json({
                error:
                    isPrivilegedAdmin(req.user.role)
                        ? 'Accès refusé'
                        : 'Modification possible uniquement en brouillon ou après retour (ou compte administrateur).',
            });
        }

        if (req.body?.directionId) {
            const d = await req.prisma.direction.findUnique({ where: { id: req.body.directionId }, select: { id: true } });
            if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
        }
        let eventProjectId = req.body?.projectId || null;
        if (eventProjectId || isResponsable(req.user?.role)) {
            const projectCheck = await validateProjectForUserAction(
                req.prisma,
                req.user,
                eventProjectId,
                { requiredForResponsable: false },
            );
            if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
            eventProjectId = projectCheck.value;
        }

        const title = String(req.body?.title || '').trim();
        if (!title) return res.status(400).json({ error: 'Titre requis.' });

        let typeFields;
        try {
            typeFields = await resolvePlanningEventTypeFields(req.prisma, {
                type: req.body?.type,
                eventTypeId: req.body?.eventTypeId,
            });
        } catch (e) {
            return res.status(e.statusCode || 400).json({ error: e.message });
        }

        const event = await req.prisma.planningEvent.create({
            data: {
                planningId: req.params.id,
                title,
                type: typeFields.type,
                eventTypeId: typeFields.eventTypeId,
                startTime: new Date(req.body.startTime),
                endTime: new Date(req.body.endTime),
                roomId: req.body.roomId || null,
                directionId: req.body.directionId || null,
                projectId: eventProjectId,
                destination: req.body.destination ?? null,
                description: req.body.description ?? null,
            },
            include: PLANNING_EVENT_INCLUDE,
        });

        logger.info('PLANNING_EVENT_CREATED', `Événement créé sur planning ${req.params.id}`, {
            planningId: req.params.id,
            userId: req.user.id,
            admin: isPrivilegedAdmin(req.user.role),
        });
        if (isPrivilegedAdmin(req.user.role)) {
            await createAuditLog(req, 'PLANNING_EVENT_CREATED', 'PlanningEvent', event.id, `Événement ajouté par admin sur planning ${req.params.id}`);
        }

        res.json(event);
    } catch (error) {
        logger.error('CREATE_PLANNING_EVENT', 'Erreur création événement', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// PUT /:id/events/:eventId
router.put('/:id/events/:eventId', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({ where: { id: req.params.id } });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (!canManagePlanningEvents(planning, req.user)) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        const existing = await req.prisma.planningEvent.findFirst({
            where: { id: req.params.eventId, planningId: req.params.id },
        });
        if (!existing) return res.status(404).json({ error: 'Événement introuvable' });

        const clean = {
            ...(req.body.title !== undefined && { title: req.body.title }),
            ...(req.body.startTime && { startTime: new Date(req.body.startTime) }),
            ...(req.body.endTime && { endTime: new Date(req.body.endTime) }),
            ...(req.body.roomId !== undefined && { roomId: req.body.roomId || null }),
            ...(req.body.directionId !== undefined && { directionId: req.body.directionId || null }),
            ...(req.body.projectId !== undefined && { projectId: req.body.projectId || null }),
            ...(req.body.destination !== undefined && { destination: req.body.destination }),
            ...(req.body.description !== undefined && { description: req.body.description }),
        };
        if (req.body.directionId) {
            const d = await req.prisma.direction.findUnique({ where: { id: req.body.directionId }, select: { id: true } });
            if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
        }
        if (req.body.projectId !== undefined || isResponsable(req.user?.role)) {
            const targetProjectId = req.body.projectId !== undefined
                ? (req.body.projectId || null)
                : (existing.projectId || null);
            const projectCheck = await validateProjectForUserAction(
                req.prisma,
                req.user,
                targetProjectId,
                { requiredForResponsable: false },
            );
            if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
            if (req.body.projectId !== undefined) {
                clean.projectId = projectCheck.value;
            }
        }
        if (req.body.type !== undefined || req.body.eventTypeId !== undefined) {
            let typeFields;
            try {
                typeFields = await resolvePlanningEventTypeFields(req.prisma, {
                    type: req.body.type !== undefined ? req.body.type : existing.type,
                    eventTypeId: req.body.eventTypeId !== undefined ? req.body.eventTypeId : existing.eventTypeId,
                });
            } catch (e) {
                return res.status(e.statusCode || 400).json({ error: e.message });
            }
            clean.type = typeFields.type;
            clean.eventTypeId = typeFields.eventTypeId;
        }
        const event = await req.prisma.planningEvent.update({
            where: { id: req.params.eventId },
            data: clean,
            include: PLANNING_EVENT_INCLUDE,
        });
        if (isPrivilegedAdmin(req.user.role)) {
            await createAuditLog(req, 'PLANNING_EVENT_UPDATED', 'PlanningEvent', req.params.eventId, `Événement modifié par admin`);
        }
        res.json(event);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id/events/:eventId', async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({ where: { id: req.params.id } });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (!canManagePlanningEvents(planning, req.user)) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        await req.prisma.planningEvent.delete({ where: { id: req.params.eventId } });

        logger.info('PLANNING_EVENT_DELETED', `Événement ${req.params.eventId} supprimé`, {
            planningId: req.params.id,
            userId: req.user.id,
        });
        if (isPrivilegedAdmin(req.user.role)) {
            await createAuditLog(req, 'PLANNING_EVENT_DELETED', 'PlanningEvent', req.params.eventId, `Événement supprimé par admin`);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
