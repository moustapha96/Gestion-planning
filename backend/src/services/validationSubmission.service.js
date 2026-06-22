const { STATUS_AFTER_COORDINATOR } = require('../config/planningWorkflow');
const { getProjectCoordinator } = require('./projectCoordinator.service');
const {
    notifyMeetingPendingCoordinatorReview,
    notifyMissionPendingCoordinatorReview,
    notifyPlanningPendingCoordinatorReview,
} = require('./projectCoordinator.service');
const {
    notifyConsolidatorsPendingMeeting,
    notifyConsolidatorsPendingMission,
    notifyPlanningPendingConsolidation,
    formatPlanningWeekLabel,
} = require('./projectConsolidator.service');

async function projectHasCoordinator(prisma, projectId) {
    if (!projectId) return false;
    const coordinator = await getProjectCoordinator(prisma, projectId);
    return Boolean(coordinator);
}

/**
 * Démarre le circuit : coordinateur (1) si désigné, sinon consolidation directe (2).
 * @returns {{ status: string, step: number, skippedCoordinator?: boolean }}
 */
async function startMeetingValidation(prisma, meeting, organizer) {
    const projectId = meeting.projectId || meeting.project?.id || null;
    if (await projectHasCoordinator(prisma, projectId)) {
        await notifyMeetingPendingCoordinatorReview(prisma, meeting, organizer);
        return { status: 'DRAFT', step: 1 };
    }
    await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: STATUS_AFTER_COORDINATOR },
    });
    const enriched = { ...meeting, status: STATUS_AFTER_COORDINATOR };
    await notifyConsolidatorsPendingMeeting(prisma, enriched, organizer);
    return { status: STATUS_AFTER_COORDINATOR, step: 2, skippedCoordinator: true };
}

async function startMissionValidation(prisma, mission, creator) {
    const projectId = mission.projectId || mission.project?.id || null;
    if (await projectHasCoordinator(prisma, projectId)) {
        await notifyMissionPendingCoordinatorReview(prisma, mission, creator);
        return { status: 'DRAFT', step: 1 };
    }
    await prisma.mission.update({
        where: { id: mission.id },
        data: { status: STATUS_AFTER_COORDINATOR },
    });
    const enriched = { ...mission, status: STATUS_AFTER_COORDINATOR };
    await notifyConsolidatorsPendingMission(prisma, enriched, creator);
    return { status: STATUS_AFTER_COORDINATOR, step: 2, skippedCoordinator: true };
}

async function startPlanningValidation(prisma, {
    planningId,
    projectId,
    ownerUserId,
    ownerName,
    weekStart,
    projectName,
    directionId,
}) {
    if (await projectHasCoordinator(prisma, projectId)) {
        await notifyPlanningPendingCoordinatorReview(prisma, {
            projectId,
            ownerUserId,
            ownerName,
            planningId,
            weekStart,
            projectName,
        });
        return { status: 'SUBMITTED', step: 1 };
    }
    await prisma.planning.update({
        where: { id: planningId },
        data: { status: STATUS_AFTER_COORDINATOR },
    });
    await notifyPlanningPendingConsolidation(prisma, {
        projectId,
        ownerUserId,
        ownerName,
        planningId,
        weekStart,
        projectName,
        directionId,
    });
    return { status: STATUS_AFTER_COORDINATOR, step: 2, skippedCoordinator: true };
}

async function resolveInitialResponsibleStatus(prisma, projectId) {
    if (await projectHasCoordinator(prisma, projectId)) {
        return 'DRAFT';
    }
    return STATUS_AFTER_COORDINATOR;
}

module.exports = {
    projectHasCoordinator,
    startMeetingValidation,
    startMissionValidation,
    startPlanningValidation,
    resolveInitialResponsibleStatus,
    formatPlanningWeekLabel,
};
