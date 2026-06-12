const { isPrivilegedAdmin } = require('../config/roles');
const { canValidatePlanningAsCoordinator, projectHasConsolidator } = require('./validationPolicy.service');
const { attachPlanningValidationProject } = require('./projectConsolidator.service');
const { PENDING_COORDINATOR_STATUSES } = require('../config/planningWorkflow');

const COORDINATOR_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    isDeleted: true,
};

const PROJECT_COORDINATOR_INCLUDE = {
    coordinator: { select: COORDINATOR_USER_SELECT },
};

async function getProjectCoordinator(prisma, projectId) {
    if (!projectId) return null;
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            name: true,
            coordinatorId: true,
            coordinator: { select: COORDINATOR_USER_SELECT },
        },
    });
    const c = project?.coordinator;
    if (!c || !c.isActive || c.isDeleted) return null;
    return c;
}

function isUserProjectCoordinator(user, projectOrCoordinatorId) {
    if (!user?.id) return false;
    const coordinatorId = typeof projectOrCoordinatorId === 'string'
        ? projectOrCoordinatorId
        : projectOrCoordinatorId?.coordinatorId;
    return Boolean(coordinatorId && coordinatorId === user.id);
}

function canActAsCoordinator(user, projectOrCoordinatorId) {
    if (!user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return isUserProjectCoordinator(user, projectOrCoordinatorId);
}

async function canUserCoordinatePlanning(prisma, user, planning) {
    if (!user || !planning) return false;
    if (!planning.user && planning.userId) {
        planning.user = await prisma.user.findUnique({
            where: { id: planning.userId },
            select: { id: true, name: true, email: true, projectId: true },
        });
    }
    await attachPlanningValidationProject(prisma, planning);
    return canValidatePlanningAsCoordinator(planning, user);
}

/** Message d'erreur explicite si le statut ou le palier bloque la validation coordinateur. */
function coordinatorApproveBlockingReason(planning) {
    const allowedStatuses = ['SUBMITTED', ...PENDING_COORDINATOR_STATUSES];
    if (!allowedStatuses.includes(planning?.status)) {
        return 'Ce planning n\'est pas en attente de validation.';
    }
    const project = planning.user?.project || planning.project || null;
    if (projectHasConsolidator(project) && planning.status === 'SUBMITTED') {
        return 'Ce planning doit d\'abord être consolidé avant validation par le coordinateur.';
    }
    return null;
}

async function canUserReturnPlanning(prisma, user, planning) {
    return canUserCoordinatePlanning(prisma, user, planning);
}

async function validateCoordinatorId(prisma, coordinatorIdRaw) {
    if (coordinatorIdRaw === null || coordinatorIdRaw === undefined || coordinatorIdRaw === '') {
        return { ok: true, value: null };
    }
    const id = String(coordinatorIdRaw).trim();
    const user = await prisma.user.findFirst({
        where: { id, isDeleted: false, isActive: true },
        select: { id: true },
    });
    if (!user) return { ok: false, error: 'Coordinateur introuvable ou inactif.' };
    return { ok: true, value: id };
}

async function notifyProjectCoordinatorAssigned(prisma, projectId, userId, options = {}) {
    if (!projectId || !userId) return;
    const { notificationService } = require('./notification.service');
    const [user, project] = await Promise.all([
        prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            select: COORDINATOR_USER_SELECT,
        }),
        prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true, code: true },
        }),
    ]);
    if (!user?.email || !project) return;

    const assignedByName = options.assignedByName || 'L\'administration';
    const link = `/projects/${project.id}`;
    const title = `Coordinateur du projet « ${project.name} »`;
    const message = `${assignedByName} vous a désigné coordinateur du projet ${project.name}.`;

    await notificationService.createNotification(
        prisma,
        user.id,
        'PROJECT_COORDINATOR_ASSIGNED',
        title,
        message,
        link,
    );
    try {
        await notificationService.sendFullNotification(
            prisma,
            user.id,
            user.email,
            'PROJECT_COORDINATOR_ASSIGNED',
            'PROJECT_COORDINATOR_ASSIGNED',
            [user, project, assignedByName],
            title,
            message,
            link,
        );
    } catch {
        // email optionnel
    }
}

const { getGlobalConsolidatorRoleUsers } = require('./projectConsolidator.service');

/** Notifie le coordinateur ou, à défaut, les utilisateurs au rôle Consolidateur. */
async function notifySecondStepValidators(prisma, {
    projectId,
    type,
    emailType,
    title,
    message,
    link,
    emailArgsBuilder,
}) {
    const { notificationService } = require('./notification.service');
    const coordinator = await getProjectCoordinator(prisma, projectId);
    const isFallbackRole = !coordinator?.email;
    const recipients = coordinator?.email
        ? [coordinator]
        : (await getGlobalConsolidatorRoleUsers(prisma)).filter((u) => u.email);

    for (const recipient of recipients) {
        try {
            const emailArgs = typeof emailArgsBuilder === 'function'
                ? emailArgsBuilder(recipient, { isFallbackRole })
                : [recipient];
            await notificationService.sendFullNotification(
                prisma,
                recipient.id,
                recipient.email,
                type,
                emailType || type,
                emailArgs,
                title,
                message,
                link,
            );
        } catch {
            // notification optionnelle
        }
    }
}

/** Coordinateur / repli : réunion consolidée, en attente de validation finale. */
async function notifyMeetingPendingFinalApproval(prisma, meeting, organizer) {
    const ownerName = organizer?.name || 'Un responsable';
    const link = `/meetings/${meeting.id}`;
    return notifySecondStepValidators(prisma, {
        projectId: meeting.projectId,
        type: 'MEETING_PENDING_COORDINATOR',
        emailType: 'MEETING_PENDING_COORDINATOR',
        title: `Réunion à valider : ${meeting.title}`,
        message: `${ownerName} : la réunion « ${meeting.title} » a été consolidée et attend votre validation finale avant publication.`,
        link,
        emailArgsBuilder: (recipient, context) => [
            recipient,
            meeting,
            organizer,
            meeting.room,
            meeting.project?.name,
            context,
        ],
    });
}

/** Coordinateur / repli : planning consolidé, en attente de validation finale. */
async function notifyPlanningSecondStepValidators(prisma, {
    projectId,
    ownerUserId,
    ownerName,
    planningId,
    weekStart,
    projectName,
}) {
    const { formatPlanningWeekLabel } = require('./projectConsolidator.service');
    const weekLabel = formatPlanningWeekLabel(weekStart);
    const link = `/plannings/${planningId}`;
    return notifySecondStepValidators(prisma, {
        projectId,
        type: 'PLANNING_PENDING_COORDINATOR',
        emailType: 'PLANNING_PENDING_COORDINATOR',
        title: 'Planning à valider',
        message: `Le planning de ${ownerName || 'un responsable'}${weekLabel ? ` (semaine du ${weekLabel})` : ''} a été consolidé et attend votre validation finale.`,
        link,
        emailArgsBuilder: (recipient, context) => [
            recipient,
            ownerName,
            planningId,
            weekLabel,
            projectName,
            context,
        ],
    });
}

/** Coordinateur : planning consolidé, en attente de validation. */
async function notifyCoordinatorPlanningPending(prisma, {
    projectId,
    ownerUserId,
    ownerName,
    planningId,
    weekStart,
    projectName,
}) {
    const { formatPlanningWeekLabel } = require('./projectConsolidator.service');
    await notifyPlanningSecondStepValidators(prisma, {
        projectId,
        ownerUserId,
        ownerName,
        planningId,
        weekStart,
        projectName,
    });
}

module.exports = {
    COORDINATOR_USER_SELECT,
    PROJECT_COORDINATOR_INCLUDE,
    getProjectCoordinator,
    notifyMeetingPendingFinalApproval,
    notifyPlanningSecondStepValidators,
    notifyCoordinatorPlanningPending,
    isUserProjectCoordinator,
    canActAsCoordinator,
    canUserCoordinatePlanning,
    coordinatorApproveBlockingReason,
    canUserReturnPlanning,
    validateCoordinatorId,
    notifyProjectCoordinatorAssigned,
};
