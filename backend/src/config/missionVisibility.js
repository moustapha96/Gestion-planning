const { ROLES, isPrivilegedAdmin } = require('./roles');
const {
    isPendingConsolidatorValidation,
    isPendingCoordinatorValidation,
} = require('./planningWorkflow');
const {
    canApproveDraftMission,
    canCoordinateDraftMission,
    canConsolidatePendingMission,
    canFinalizePendingMission,
    isGlobalConsolidatorRole,
} = require('../services/validationPolicy.service');

/** Missions visibles sur le calendrier. */
const PUBLISHED_MISSION_STATUSES = ['CONFIRMED'];

function isPublishedMissionStatus(status) {
    return PUBLISHED_MISSION_STATUSES.includes(status);
}

function publishedMissionStatusFilter() {
    return { status: { in: PUBLISHED_MISSION_STATUSES } };
}

function coordinatorDraftMissionFilter(user) {
    if (!user?.id) return null;
    return {
        status: 'DRAFT',
        createdBy: { role: ROLES.RESPONSABLE },
        project: { coordinatorId: user.id },
    };
}

function consolidatorPendingMissionFilter(user) {
    if (!isGlobalConsolidatorRole(user)) return null;
    return {
        status: 'CONSOLIDATOR_PENDING',
        createdBy: { role: ROLES.RESPONSABLE },
    };
}

function legacyCoordinatorPendingMissionFilter(user) {
    if (!user?.id) return null;
    return {
        status: { in: require('./planningWorkflow').LEGACY_PENDING_COORDINATOR_STATUSES },
        project: { coordinatorId: user.id },
    };
}

function responsableMissionScope(user) {
    if (!user?.id || user.role !== ROLES.RESPONSABLE) return null;
    return { createdById: user.id };
}

function missionListWhereForUser(user) {
    const ownOnly = responsableMissionScope(user);
    if (ownOnly) return ownOnly;
    if (isPrivilegedAdmin(user?.role)) {
        return { status: { not: 'CANCELLED' } };
    }
    const draftAsCoordinator = coordinatorDraftMissionFilter(user);
    const pendingConsolidator = consolidatorPendingMissionFilter(user);
    const legacyPending = legacyCoordinatorPendingMissionFilter(user);
    return {
        OR: [
            { createdById: user.id },
            { assignments: { some: { userId: user.id } } },
            ...(draftAsCoordinator ? [draftAsCoordinator] : []),
            ...(pendingConsolidator ? [pendingConsolidator] : []),
            ...(legacyPending ? [legacyPending] : []),
        ],
    };
}

function requiresConsolidatorApproval(creatorRole) {
    return creatorRole === ROLES.RESPONSABLE;
}

function canConfirmMission(mission, user) {
    if (!mission || !user) return false;
    if (isPrivilegedAdmin(user?.role)) {
        return mission.status === 'DRAFT'
            || isPendingConsolidatorValidation(mission.status)
            || isPendingCoordinatorValidation(mission.status);
    }
    if (isPendingConsolidatorValidation(mission.status)) {
        return canConsolidatePendingMission(mission, user);
    }
    if (isPendingCoordinatorValidation(mission.status)) {
        return canFinalizePendingMission(mission, user);
    }
    if (mission.status !== 'DRAFT') return false;
    const creatorRole = mission.createdBy?.role;
    if (requiresConsolidatorApproval(creatorRole)) {
        return canApproveDraftMission(mission, user);
    }
    return mission.createdById === user.id;
}

function canConsolidateMission(mission, user) {
    return canConsolidatePendingMission(mission, user);
}

function canCoordinateMission(mission, user) {
    return canCoordinateDraftMission(mission, user);
}

function canFinalizeMission(mission, user) {
    return canFinalizePendingMission(mission, user);
}

function canManageMission(mission, user) {
    if (!mission || !user?.id) return false;
    return mission.createdById === user.id || isPrivilegedAdmin(user?.role);
}

function canEditMission(mission, user) {
    if (!canManageMission(mission, user)) return false;
    return mission.status !== 'CANCELLED';
}

function canViewMissionForUser(mission, user) {
    if (!mission || !user?.id) return false;
    const ownOnly = responsableMissionScope(user);
    if (ownOnly) return mission.createdById === user.id;
    if (isPrivilegedAdmin(user.role)) return true;
    if (
        mission.status === 'DRAFT'
        && mission.createdBy?.role === ROLES.RESPONSABLE
        && mission.project?.coordinatorId === user.id
    ) {
        return true;
    }
    if (
        isPendingConsolidatorValidation(mission.status)
        && isGlobalConsolidatorRole(user)
        && mission.createdBy?.role === ROLES.RESPONSABLE
    ) {
        return true;
    }
    if (
        isPendingCoordinatorValidation(mission.status)
        && mission.project?.coordinatorId === user.id
    ) {
        return true;
    }
    return (
        mission.createdById === user.id
        || (mission.assignments || []).some((a) => a.userId === user.id)
    );
}

module.exports = {
    PUBLISHED_MISSION_STATUSES,
    isPublishedMissionStatus,
    publishedMissionStatusFilter,
    missionListWhereForUser,
    requiresConsolidatorApproval,
    canConfirmMission,
    canConsolidateMission,
    canCoordinateMission,
    canFinalizeMission,
    canManageMission,
    canEditMission,
    canViewMissionForUser,
    responsableMissionScope,
};
