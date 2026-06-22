const { isPrivilegedAdmin } = require('../config/roles');
const {
    canCoordinateSubmittedPlanning,
    canValidatePlanningAsCoordinator,
} = require('./validationPolicy.service');
const { attachPlanningValidationProject } = require('./projectConsolidator.service');
const {
    isPendingConsolidatorValidation,
    isPendingCoordinatorValidation,
} = require('../config/planningWorkflow');

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
    if (planning.status === 'SUBMITTED') {
        return canCoordinateSubmittedPlanning(planning, user);
    }
    return canValidatePlanningAsCoordinator(planning, user);
}

/** Message d'erreur explicite si le statut ou le palier bloque la validation coordinateur. */
function coordinatorApproveBlockingReason(planning) {
    if (planning?.status === 'SUBMITTED') return null;
    if (isPendingCoordinatorValidation(planning?.status)) return null;
    if (isPendingConsolidatorValidation(planning?.status)) {
        return 'Ce planning doit d\'abord être consolidé (étape 2/2) avant publication.';
    }
    return 'Ce planning n\'est pas en attente de validation par le coordinateur.';
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

/** Notifie uniquement le coordinateur du projet (étape 1). */
async function notifyCoordinatorFirstStep(prisma, {
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
    if (!coordinator?.email) {
        return { notified: false, reason: 'NO_COORDINATOR' };
    }

    try {
        const emailArgs = typeof emailArgsBuilder === 'function'
            ? emailArgsBuilder(coordinator, { isFallbackRole: false })
            : [coordinator];
        await notificationService.sendFullNotification(
            prisma,
            coordinator.id,
            coordinator.email,
            type,
            emailType || type,
            emailArgs,
            title,
            message,
            link,
        );
        return { notified: true };
    } catch {
        return { notified: false, reason: 'NOTIFY_FAILED' };
    }
}

/** Coordinateur (étape 1) : réunion en brouillon soumise par un responsable. */
async function notifyMeetingPendingCoordinatorReview(prisma, meeting, organizer) {
    const ownerName = organizer?.name || 'Un responsable';
    const link = `/meetings/${meeting.id}`;
    return notifyCoordinatorFirstStep(prisma, {
        projectId: meeting.projectId,
        type: 'MEETING_PENDING_COORDINATOR',
        emailType: 'MEETING_PENDING_COORDINATOR',
        title: `Réunion à valider : ${meeting.title}`,
        message: `${ownerName} a soumis la réunion « ${meeting.title} » — validation coordinateur requise (1er palier).`,
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

/** @deprecated alias — utiliser notifyMeetingPendingCoordinatorReview */
async function notifyMeetingPendingFinalApproval(prisma, meeting, organizer) {
    return notifyMeetingPendingCoordinatorReview(prisma, meeting, organizer);
}

/** Coordinateur (étape 1) : mission en brouillon soumise par un responsable. */
async function notifyMissionPendingCoordinatorReview(prisma, mission, creator) {
    const ownerName = creator?.name || 'Un responsable';
    const link = `/missions/${mission.id}`;
    return notifyCoordinatorFirstStep(prisma, {
        projectId: mission.projectId,
        type: 'MISSION_PENDING_COORDINATOR',
        emailType: 'MISSION_PENDING_COORDINATOR',
        title: `Mission à valider : ${mission.title}`,
        message: `${ownerName} a soumis la mission « ${mission.title} » — validation coordinateur requise (1er palier).`,
        link,
        emailArgsBuilder: (recipient, context) => [
            recipient,
            mission,
            creator,
            mission.project?.name,
            context,
        ],
    });
}

/** @deprecated alias */
async function notifyMissionPendingFinalApproval(prisma, mission, creator) {
    return notifyMissionPendingCoordinatorReview(prisma, mission, creator);
}

/** Coordinateur (étape 1) : planning soumis par un responsable. */
async function notifyPlanningPendingCoordinatorReview(prisma, {
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
    return notifyCoordinatorFirstStep(prisma, {
        projectId,
        type: 'PLANNING_PENDING_COORDINATOR',
        emailType: 'PLANNING_PENDING_COORDINATOR',
        title: 'Planning à valider',
        message: `${ownerName || 'Un responsable'} a soumis un planning${weekLabel ? ` (semaine du ${weekLabel})` : ''} — validation coordinateur requise (1er palier).`,
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

module.exports = {
    COORDINATOR_USER_SELECT,
    PROJECT_COORDINATOR_INCLUDE,
    getProjectCoordinator,
    notifyMeetingPendingCoordinatorReview,
    notifyMeetingPendingFinalApproval,
    notifyMissionPendingCoordinatorReview,
    notifyMissionPendingFinalApproval,
    notifyPlanningPendingCoordinatorReview,
    notifyPlanningSecondStepValidators: notifyPlanningPendingCoordinatorReview,
    notifyCoordinatorPlanningPending: notifyPlanningPendingCoordinatorReview,
    isUserProjectCoordinator,
    canActAsCoordinator,
    canUserCoordinatePlanning,
    coordinatorApproveBlockingReason,
    canUserReturnPlanning,
    validateCoordinatorId,
    notifyProjectCoordinatorAssigned,
};
