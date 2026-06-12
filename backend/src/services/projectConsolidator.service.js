const { ROLES, isPrivilegedAdmin } = require('../config/roles');
const {
    projectHasConsolidator,
    projectNeedsGlobalConsolidatorFallback,
    canConsolidateSubmittedPlanning,
} = require('./validationPolicy.service');
const { notificationService } = require('./notification.service');
const { logger } = require('../utils/logger');

const CONSOLIDATOR_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    isDeleted: true,
};

const PROJECT_CONSOLIDATOR_INCLUDE = {
    consolidator: { select: CONSOLIDATOR_USER_SELECT },
};

/** Charge le consolidateur actif d'un projet (null si non défini ou inactif). */
async function getProjectConsolidator(prisma, projectId) {
    if (!projectId) return null;
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            name: true,
            consolidatorId: true,
            consolidator: { select: CONSOLIDATOR_USER_SELECT },
        },
    });
    const c = project?.consolidator;
    if (!c || !c.isActive || c.isDeleted) return null;
    return c;
}

const PROJECT_VALIDATION_SELECT = {
    id: true,
    name: true,
    code: true,
    consolidatorId: true,
    coordinatorId: true,
};

function hasCompleteValidationProject(project) {
    return Boolean(
        project?.id
        && project.consolidatorId !== undefined
        && project.coordinatorId !== undefined,
    );
}

/** Projet lié à une demande de validation (explicite ou via le responsable). */
async function resolveProjectIdForConsolidation(prisma, explicitProjectId, userId) {
    if (explicitProjectId) return explicitProjectId;
    if (!userId) return null;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { projectId: true },
    });
    return user?.projectId || null;
}

/** Candidats projet pour le circuit de validation d'un planning. */
async function scorePlanningProjectCandidates(prisma, planning) {
    const scores = new Map();
    const add = (projectId, weight) => {
        if (!projectId) return;
        scores.set(projectId, (scores.get(projectId) || 0) + weight);
    };

    const ownerId = planning.userId || planning.user?.id;
    if (planning.user?.projectId) add(planning.user.projectId, 100);
    if (planning.user?.project?.id) add(planning.user.project.id, 100);

    if (ownerId) {
        if (!planning.user?.projectId) {
            const owner = await prisma.user.findUnique({
                where: { id: ownerId },
                select: { projectId: true },
            });
            if (owner?.projectId) add(owner.projectId, 100);
        }

        const designated = await prisma.project.findMany({
            where: {
                isActive: true,
                OR: [{ coordinatorId: ownerId }, { consolidatorId: ownerId }],
            },
            select: { id: true },
        });
        for (const p of designated) add(p.id, 50);
    }

    let eventProjectIds = [];
    if (planning.events?.length) {
        eventProjectIds = planning.events.map((e) => e.projectId).filter(Boolean);
    } else if (planning.id) {
        const rows = await prisma.planningEvent.findMany({
            where: { planningId: planning.id, projectId: { not: null } },
            select: { projectId: true },
        });
        eventProjectIds = rows.map((r) => r.projectId);
    }
    for (const projectId of eventProjectIds) add(projectId, 10);

    return scores;
}

/** Résout le projet de validation (consolidateur / coordinateur) d'un planning. */
async function resolvePlanningValidationProject(prisma, planning) {
    if (!planning) return null;

    const existing = planning.user?.project || planning.project || null;
    if (hasCompleteValidationProject(existing)) return existing;

    const scores = await scorePlanningProjectCandidates(prisma, planning);
    if (!scores.size) return existing || null;

    const projectId = [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return prisma.project.findUnique({
        where: { id: projectId },
        select: PROJECT_VALIDATION_SELECT,
    });
}

/** Enrichit planning.user.project pour les règles de validation. */
async function attachPlanningValidationProject(prisma, planning) {
    if (!planning) return planning;
    const project = await resolvePlanningValidationProject(prisma, planning);
    if (!project) return planning;
    if (planning.user) {
        planning.user.project = project;
        if (!planning.user.projectId) planning.user.projectId = project.id;
    } else {
        planning.project = project;
    }
    return planning;
}

function formatPlanningWeekLabel(weekStart) {
    if (!weekStart) return '';
    try {
        return new Date(weekStart).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return '';
    }
}

/** Destinataires pour une validation liée à un projet. */
async function getGlobalConsolidatorRoleUsers(prisma) {
    return prisma.user.findMany({
        where: { role: ROLES.CONSOLIDATEUR, isActive: true, isDeleted: false },
        select: CONSOLIDATOR_USER_SELECT,
    });
}

async function resolveConsolidatorRecipients(prisma, projectId) {
    const project = projectId
        ? await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, consolidatorId: true, coordinatorId: true },
        })
        : null;

    if (project && projectHasConsolidator(project)) {
        const designated = await getProjectConsolidator(prisma, projectId);
        if (designated?.email) return [designated];
        logger.warn('CONSOLIDATOR_NOTIFY', 'Consolidateur désigné inactif ou introuvable', { projectId });
        return [];
    }

    if (project?.coordinatorId) {
        const coordinator = await prisma.user.findFirst({
            where: { id: project.coordinatorId, isActive: true, isDeleted: false },
            select: CONSOLIDATOR_USER_SELECT,
        });
        if (coordinator?.email) return [coordinator];
    }

    if (!projectId || projectNeedsGlobalConsolidatorFallback(project)) {
        const globalConsolidators = await getGlobalConsolidatorRoleUsers(prisma);
        return globalConsolidators.filter((u) => u.email);
    }

    return [];
}

async function notifyConsolidatorsForProject(prisma, _req, projectId, {
    type,
    emailType,
    emailArgs,
    title,
    message,
    link,
    ownerUserId,
}) {
    const resolvedProjectId = await resolveProjectIdForConsolidation(prisma, projectId, ownerUserId);
    const recipients = await resolveConsolidatorRecipients(prisma, resolvedProjectId);
    if (!recipients.length) {
        logger.warn('CONSOLIDATOR_NOTIFY_SKIPPED', 'Aucun consolidateur joignable pour cette notification', {
            type,
            projectId: resolvedProjectId,
            ownerUserId,
        });
        return { sent: 0, failed: 0, skipped: true };
    }

    let sent = 0;
    let failed = 0;
    for (const c of recipients) {
        try {
            const args = typeof emailArgs === 'function' ? emailArgs(c) : (emailArgs || [c]);
            const result = await notificationService.sendFullNotification(
                prisma,
                c.id,
                c.email,
                type,
                emailType || type,
                args,
                title,
                message,
                link,
            );
            if (result?.email?.success || result?.email?.skipped) sent += 1;
            else failed += 1;
        } catch (err) {
            failed += 1;
            logger.warn('CONSOLIDATOR_NOTIFY_FAILED', err.message, {
                type,
                consolidatorId: c.id,
                projectId: resolvedProjectId,
            });
        }
    }
    return { sent, failed, skipped: false };
}

async function prepareMeetingForConsolidatorNotify(prisma, meeting, organizer) {
    const projectId = await resolveProjectIdForConsolidation(
        prisma,
        meeting.projectId,
        organizer?.id || meeting.organizerId,
    );
    let room = meeting.room;
    if (!room && meeting.roomId) {
        room = await prisma.room.findUnique({
            where: { id: meeting.roomId },
            select: { id: true, name: true, location: true },
        });
    }
    return {
        projectId,
        meeting: { ...meeting, room: room || null },
        organizer,
    };
}

/** Consolidateur : réunion en brouillon créée/modifiée par un responsable. */
async function notifyConsolidatorsPendingMeeting(prisma, meeting, organizer) {
    const { projectId, meeting: enriched, organizer: org } = await prepareMeetingForConsolidatorNotify(
        prisma,
        meeting,
        organizer,
    );
    const ownerName = org?.name || 'Un responsable';
    return notifyConsolidatorsForProject(prisma, null, projectId, {
        ownerUserId: org?.id || meeting.organizerId,
        type: 'MEETING_PENDING_APPROVAL',
        emailType: 'MEETING_PENDING_APPROVAL',
        emailArgs: (c) => [c, enriched, org, enriched.room],
        title: `Réunion à valider : ${enriched.title}`,
        message: `${ownerName} a soumis une réunion en attente de validation.`,
        link: `/meetings/${enriched.id}`,
    });
}

/** Consolidateur : planning soumis par un responsable. */
async function notifyPlanningPendingConsolidation(prisma, {
    projectId,
    ownerUserId,
    ownerName,
    planningId,
    weekStart,
    projectName,
}) {
    const weekLabel = formatPlanningWeekLabel(weekStart);
    return notifyConsolidatorsForProject(prisma, null, projectId, {
        ownerUserId,
        type: 'PLANNING_PENDING_CONSOLIDATION',
        emailType: 'PLANNING_PENDING_CONSOLIDATION',
        emailArgs: (c) => [c, ownerName, planningId, weekLabel, projectName],
        title: 'Planning à consolider',
        message: `${ownerName || 'Un responsable'} a soumis un planning${weekLabel ? ` (semaine du ${weekLabel})` : ''} en attente de consolidation.`,
        link: `/plannings/${planningId}`,
    });
}

function isUserProjectConsolidator(user, projectOrConsolidatorId) {
    if (!user?.id) return false;
    const consolidatorId = typeof projectOrConsolidatorId === 'string'
        ? projectOrConsolidatorId
        : projectOrConsolidatorId?.consolidatorId;
    return Boolean(consolidatorId && consolidatorId === user.id);
}

function canActAsConsolidator(user, projectOrConsolidatorId) {
    if (!user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return isUserProjectConsolidator(user, projectOrConsolidatorId);
}

async function canUserConsolidatePlanning(prisma, user, planning) {
    if (!user || !planning) return false;
    if (!planning.user && planning.userId) {
        planning.user = await prisma.user.findUnique({
            where: { id: planning.userId },
            select: { id: true, name: true, email: true, projectId: true },
        });
    }
    await attachPlanningValidationProject(prisma, planning);
    return canConsolidateSubmittedPlanning(planning, user);
}

/** Email + notification in-app : nouvel consolidateur désigné pour un projet. */
async function notifyProjectConsolidatorAssigned(prisma, projectId, userId, options = {}) {
    if (!projectId || !userId) return;
    const [user, project] = await Promise.all([
        prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            select: CONSOLIDATOR_USER_SELECT,
        }),
        prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true, code: true },
        }),
    ]);
    if (!user?.email || !project) return;

    const assignedByName = options.assignedByName || 'L\'administration';
    const link = `/projects/${project.id}`;
    const title = 'Consolidateur de projet';
    const body = `Vous êtes désigné(e) consolidateur(trice) du projet « ${project.name} ». Vous validez les réunions, plannings et demandes liées à ce projet.`;

    try {
        await notificationService.sendFullNotification(
            prisma,
            user.id,
            user.email,
            'PROJECT_CONSOLIDATOR_ASSIGNED',
            'PROJECT_CONSOLIDATOR_ASSIGNED',
            [user, project, assignedByName],
            title,
            body,
            link,
        );
    } catch (err) {
        logger.warn('PROJECT_CONSOLIDATOR_NOTIFY_FAILED', err.message, { projectId, userId });
    }
}

/** Affecte l'utilisateur comme consolidateur du projet (ex. rattachement projet sur fiche user). */
async function assignUserAsProjectConsolidator(prisma, projectId, userId, options = {}) {
    if (!projectId || !userId) return;
    const before = await prisma.project.findUnique({
        where: { id: projectId },
        select: { consolidatorId: true },
    });
    const changed = before?.consolidatorId !== userId;
    await prisma.project.update({
        where: { id: projectId },
        data: { consolidatorId: userId },
    });
    if (changed) {
        await notifyProjectConsolidatorAssigned(prisma, projectId, userId, options);
    }
}

/** Retire le consolidateur du projet si c'était cet utilisateur (changement de projet). */
async function clearProjectConsolidatorIfUser(prisma, projectId, userId) {
    if (!projectId || !userId) return;
    await prisma.project.updateMany({
        where: { id: projectId, consolidatorId: userId },
        data: { consolidatorId: null },
    });
}

async function validateConsolidatorId(prisma, consolidatorId) {
    if (consolidatorId === undefined) return { ok: true };
    if (consolidatorId === null || consolidatorId === '') return { ok: true, value: null };
    const user = await prisma.user.findFirst({
        where: { id: consolidatorId, isDeleted: false, isActive: true },
        select: { id: true },
    });
    if (!user) return { ok: false, error: 'Consolidateur introuvable ou inactif.' };
    return { ok: true, value: consolidatorId };
}

module.exports = {
    CONSOLIDATOR_USER_SELECT,
    PROJECT_CONSOLIDATOR_INCLUDE,
    PROJECT_VALIDATION_SELECT,
    getProjectConsolidator,
    getGlobalConsolidatorRoleUsers,
    resolveProjectIdForConsolidation,
    resolvePlanningValidationProject,
    attachPlanningValidationProject,
    resolveConsolidatorRecipients,
    notifyConsolidatorsForProject,
    notifyConsolidatorsPendingMeeting,
    notifyPlanningPendingConsolidation,
    formatPlanningWeekLabel,
    isUserProjectConsolidator,
    canActAsConsolidator,
    canUserConsolidatePlanning,
    validateConsolidatorId,
    notifyProjectConsolidatorAssigned,
    assignUserAsProjectConsolidator,
    clearProjectConsolidatorIfUser,
};
