const express = require('express');
const { z } = require('zod');
const roleMiddleware = require('../middlewares/role.middleware');
const { notificationService } = require('../services/notification.service');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();
const { ROLES, ADMIN_ROUTE_ROLES, isPrivilegedAdmin } = require('../config/roles');
const {
    CP_PENDING,
    SG_PENDING,
    DG_PENDING,
    LEGACY_IN_CONSOLIDATION,
    STATUS_AFTER_CONSOLIDATION,
    isPendingValidation,
} = require('../config/planningWorkflow');
const { resolvePlanningEventTypeFields } = require('../services/eventType.service');

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

        const where = {
            weekStart: { gte: weekStart, lt: weekEnd },
        };
        if (req.query.mine === '1' && req.user?.id) {
            where.userId = req.user.id;
        }

        const plannings = await req.prisma.planning.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                events: { include: PLANNING_EVENT_INCLUDE },
            },
            orderBy: [{ user: { name: 'asc' } }, { weekStart: 'asc' }],
        });

        res.json(plannings);
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
            data: { userId, weekStart: weekStartNorm, status: 'DRAFT' },
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
        const planning = await req.prisma.planning.findUnique({ where: { id: req.params.id }, include: { user: true } });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (!['DRAFT', 'RETURNED'].includes(planning.status)) {
            return res.status(400).json({ error: 'Seul un brouillon ou un planning retourné peut être soumis.' });
        }
        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: 'SUBMITTED', submittedAt: new Date() },
            include: {
                events: { include: PLANNING_EVENT_INCLUDE },
            },
        });
        await createAuditLog(req, 'PLANNING_SUBMITTED', 'Planning', req.params.id, `Soumission admin`);
        const consolidators = await req.prisma.user.findMany({ where: { role: 'CONSOLIDATEUR', isActive: true } });
        for (const c of consolidators) {
            await notificationService.sendFullNotification(
                req.prisma, c.id, c.email, 'PLANNING_SUBMITTED', 'PLANNING_SUBMITTED',
                [c, req.params.id], 'Nouveau planning soumis', `${planning.user.name} — soumis par l'administration`, `/planning/${req.params.id}`
            );
        }
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
                user: true,
                events: { include: PLANNING_EVENT_INCLUDE },
            },
        });

        if (!planning) {
            return res.status(404).json({ error: 'Planning not found' });
        }

        const { id: viewerId, role } = req.user;
        const validationViewerRoles = [
            ROLES.CONSOLIDATEUR,
            ROLES.COORDINATEUR_PROJET,
            ROLES.SECRETAIRE_GENERAL,
            ROLES.DG,
        ];
        const canView =
            planning.userId === viewerId ||
            isPrivilegedAdmin(role) ||
            validationViewerRoles.includes(role);
        if (!canView) {
            return res.status(403).json({ error: 'Accès non autorisé à ce planning' });
        }

        const weekStart = new Date(planning.weekStart);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const weekMissions = await req.prisma.mission.findMany({
            where: {
                status: { not: 'CANCELLED' },
                OR: [{ createdById: planning.userId }, { assignments: { some: { userId: planning.userId } } }],
                AND: [{ startTime: { lt: weekEnd } }, { endTime: { gt: weekStart } }],
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                assignments: { include: { user: { select: { id: true, name: true } } } },
            },
            orderBy: { startTime: 'asc' },
        });

        res.json({
            ...planning,
            weekMissions,
        });
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
                status: 'DRAFT',
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
            include: { user: true },
        });
        const isAdmin = isPrivilegedAdmin(req.user.role);
        if (planning.userId !== req.user.id && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (!['DRAFT', 'RETURNED'].includes(planning.status)) {
            return res.status(400).json({ error: 'Seuls les brouillons ou plannings retournés peuvent être soumis à nouveau.' });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: 'SUBMITTED', submittedAt: new Date() },
            include: {
                events: { include: PLANNING_EVENT_INCLUDE },
            },
        });

        logger.info('PLANNING_SUBMITTED', `Planning soumis par ${req.user.name}`, {
            planningId: req.params.id,
            userId: req.user.id,
            byAdmin: isAdmin,
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

        const consolidators = await req.prisma.user.findMany({
            where: { role: 'CONSOLIDATEUR', isActive: true },
        });

        const submitLine = isAdmin
            ? `${planning.user.name} — soumis par l'administration`
            : `${req.user.name} a soumis son planning`;

        for (const consolidator of consolidators) {
            await notificationService.sendFullNotification(
                req.prisma,
                consolidator.id,
                consolidator.email,
                'PLANNING_SUBMITTED',
                'PLANNING_SUBMITTED',
                [consolidator, req.params.id],
                'Nouveau planning soumis',
                submitLine,
                `/plannings/${req.params.id}`
            );
        }

        const ownerMsg = isAdmin
            ? 'Votre planning a été soumis par l\'administration et est en attente de consolidation.'
            : 'Votre planning a été soumis avec succès et est en attente de consolidation';
        await notificationService.createNotification(
            req.prisma,
            planning.userId,
            'PLANNING_SUBMITTED',
            'Planning soumis',
            ownerMsg,
            `/plannings/${req.params.id}`
        );

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
router.put('/:id/consolidate', roleMiddleware([ROLES.CONSOLIDATEUR, ROLES.ADMIN, ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (planning.status !== 'SUBMITTED') {
            return res.status(400).json({ error: 'Seul un planning au statut « soumis » peut être consolidé.' });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: STATUS_AFTER_CONSOLIDATION, consolidatedAt: new Date() },
        });

        logger.info('PLANNING_CONSOLIDATED', `Planning consolidé par ${req.user.id}`, {
            planningId: req.params.id,
            consolidatorId: req.user.id,
        });

        await createAuditLog(req, 'PLANNING_CONSOLIDATED', 'Planning', req.params.id, `Planning ${req.params.id} consolidé`);

        const coordinators = await req.prisma.user.findMany({
            where: { role: ROLES.COORDINATEUR_PROJET, isActive: true, isDeleted: false },
        });

        for (const c of coordinators) {
            await notificationService.createNotification(
                req.prisma,
                c.id,
                'PLANNING_SUBMITTED',
                'Planning — validation coordinateur',
                `Un planning consolidé attend votre validation (coordinateur de projet).`,
                `/planning/${req.params.id}`
            );
        }

        await notificationService.createNotification(
            req.prisma,
            planning.userId,
            'PLANNING_IN_CONSOLIDATION',
            'Planning consolidé',
            'Votre planning a été consolidé et suit la chaîne de validation (coordinateur → accord SG ou direction → validation finale SG ou DG).',
            `/planning/${req.params.id}`
        );

        res.json(updated);
    } catch (error) {
        logger.error('CONSOLIDATE_PLANNING', 'Erreur consolidation planning', {
            planningId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/** Première validation : coordinateur de projet */
router.put('/:id/approve-cp', roleMiddleware([ROLES.COORDINATEUR_PROJET, ROLES.ADMIN, ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (planning.status !== CP_PENDING && planning.status !== LEGACY_IN_CONSOLIDATION) {
            return res.status(400).json({ error: 'Cette étape n\'est pas en attente du coordinateur de projet.' });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: SG_PENDING },
        });

        await createAuditLog(req, 'PLANNING_APPROVE_CP', 'Planning', req.params.id, `Validation coordinateur projet par ${req.user.id}`);

        const sgDgUsers = await req.prisma.user.findMany({
            where: {
                role: { in: [ROLES.SECRETAIRE_GENERAL, ROLES.DG] },
                isActive: true,
                isDeleted: false,
            },
        });
        for (const u of sgDgUsers) {
            await notificationService.createNotification(
                req.prisma,
                u.id,
                'PLANNING_SUBMITTED',
                'Planning — validation secrétaire général / direction',
                `Un planning attend votre validation (secrétaire général ou direction générale).`,
                `/planning/${req.params.id}`
            );
        }

        await notificationService.createNotification(
            req.prisma,
            planning.userId,
            'PLANNING_VALIDATION_STEP',
            'Planning — étape coordinateur',
            'Le coordinateur de projet a validé votre planning. Prochaine étape : secrétaire général ou direction générale.',
            `/planning/${req.params.id}`
        );

        res.json(updated);
    } catch (error) {
        logger.error('APPROVE_CP_PLANNING', error.message, { planningId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

/** Deuxième validation : secrétaire général ou direction générale (mêmes droits) */
router.put('/:id/approve-sg', roleMiddleware([ROLES.SECRETAIRE_GENERAL, ROLES.DG, ROLES.ADMIN, ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });
        if (planning.status !== SG_PENDING) {
            return res.status(400).json({ error: 'Cette étape n\'est pas en attente du secrétaire général / de la direction.' });
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: DG_PENDING },
        });

        await createAuditLog(req, 'PLANNING_APPROVE_SG', 'Planning', req.params.id, `Validation étape SG/Direction par ${req.user.id}`);

        const sgDgUsers = await req.prisma.user.findMany({
            where: {
                role: { in: [ROLES.SECRETAIRE_GENERAL, ROLES.DG] },
                isActive: true,
                isDeleted: false,
            },
        });
        for (const u of sgDgUsers) {
            await notificationService.createNotification(
                req.prisma,
                u.id,
                'PLANNING_SUBMITTED',
                'Planning — validation finale',
                `Un planning attend la validation finale (secrétaire général ou direction générale).`,
                `/planning/${req.params.id}`
            );
        }

        await notificationService.createNotification(
            req.prisma,
            planning.userId,
            'PLANNING_VALIDATION_STEP',
            'Planning — avant validation finale',
            'L\'accord secrétaire général / direction a été enregistré. Prochaine étape : validation définitive (SG ou DG).',
            `/planning/${req.params.id}`
        );

        res.json(updated);
    } catch (error) {
        logger.error('APPROVE_SG_PLANNING', error.message, { planningId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

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
router.put('/:id/validate', roleMiddleware([ROLES.DG, ROLES.SECRETAIRE_GENERAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const planning = await req.prisma.planning.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!planning) return res.status(404).json({ error: 'Planning introuvable' });

        const privileged = isPrivilegedAdmin(req.user.role);
        if (privileged) {
            if (!isPendingValidation(planning.status)) {
                return res.status(400).json({
                    error: 'L\'administration ne peut valider définitivement qu\'un planning en attente (coordinateur, SG ou DG).',
                });
            }
        } else if (req.user.role === ROLES.DG || req.user.role === ROLES.SECRETAIRE_GENERAL) {
            if (planning.status !== DG_PENDING) {
                return res.status(403).json({
                    error: 'La validation définitive n\'est possible qu\'à l\'étape « attente direction » (après l\'accord SG/DG).',
                });
            }
        }

        const updated = await req.prisma.planning.update({
            where: { id: req.params.id },
            data: { status: 'VALIDATED', validatedAt: new Date() },
        });

        logger.info('PLANNING_VALIDATED', `Planning validé par ${req.user.id}`, {
            planningId: req.params.id,
            validatorId: req.user.id,
            ownerId: planning.userId,
        });

        await createAuditLog(req, 'PLANNING_VALIDATED', 'Planning', req.params.id, `Planning ${req.params.id} validé définitivement`);

        await notificationService.sendFullNotification(
            req.prisma,
            planning.userId,
            planning.user.email,
            'PLANNING_VALIDATED',
            'PLANNING_VALIDATED',
            [planning.user],
            'Planning validé',
            'Votre planning a été validé définitivement.',
            `/planning/${req.params.id}`
        );

        res.json(updated);
    } catch (error) {
        logger.error('VALIDATE_PLANNING', 'Erreur validation planning', {
            planningId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
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
router.put('/:id/return', roleMiddleware([ROLES.DG, ROLES.SECRETAIRE_GENERAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const { comment } = req.body;

        const existing = await req.prisma.planning.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Planning introuvable' });
        if (!isPendingValidation(existing.status)) {
            return res.status(400).json({
                error: 'Seuls les plannings en attente de validation (coordinateur, SG ou DG) peuvent être retournés.',
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

        // Notify the planning owner (email + in-app)
        await notificationService.sendFullNotification(
            req.prisma,
            planning.userId,
            planning.user.email,
            'PLANNING_RETURNED',
            'PLANNING_RETURNED',
            [planning.user, comment],
            'Planning retourné',
            `Votre planning doit être modifié : ${comment}`,
            `/plannings/${req.params.id}`
        );

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

const editableEventStatuses = ['DRAFT', 'RETURNED'];

function canManagePlanningEvents(planning, user) {
    if (planning.status === 'CANCELLED') return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (planning.userId !== user.id) return false;
    return editableEventStatuses.includes(planning.status);
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
        if (req.body?.projectId) {
            const p = await req.prisma.project.findUnique({ where: { id: req.body.projectId }, select: { id: true } });
            if (!p) return res.status(400).json({ error: 'Projet introuvable.' });
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
                projectId: req.body.projectId || null,
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
        if (req.body.projectId) {
            const p = await req.prisma.project.findUnique({ where: { id: req.body.projectId }, select: { id: true } });
            if (!p) return res.status(400).json({ error: 'Projet introuvable.' });
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
