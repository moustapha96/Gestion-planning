const { ROLES, isPrivilegedAdmin } = require('./roles');
const { isUserProjectConsolidator } = require('../services/projectConsolidator.service');
const { isPendingCoordinatorValidation } = require('./planningWorkflow');
const {
    canApproveDraftMission,
    canConsolidateDraftMission,
    canFinalizePendingMission,
    isGlobalConsolidatorRole,
} = require('../services/validationPolicy.service');

/** Missions visibles sur le calendrier public / page d'accueil. */
const PUBLISHED_MISSION_STATUSES = ['CONFIRMED'];

function isPublishedMissionStatus(status) {
    return PUBLISHED_MISSION_STATUSES.includes(status);
}

function publishedMissionStatusFilter() {
    return { status: { in: PUBLISHED_MISSION_STATUSES } };
}

/** Brouillons à valider pour l'utilisateur désigné consolidateur d'un projet. */
function projectConsolidatorDraftMissionFilter(user) {
    if (!user?.id) return null;
    return { status: 'DRAFT', project: { consolidatorId: user.id } };
}

/** Missions consolidées, en attente de validation finale (coordinateur ou rôle dédié). */
function missionPendingFinalizeFilter(user) {
    if (!user?.id) return null;
    const or = [{ project: { coordinatorId: user.id } }];
    if (isGlobalConsolidatorRole(user)) {
        or.push({ project: { coordinatorId: null } });
        or.push({ projectId: null });
    }
    return { status: 'COORDINATOR_PENDING', OR: or };
}

/** Responsable : uniquement les missions qu'il a créées. */
function responsableMissionScope(user) {
    if (!user?.id || user.role !== ROLES.RESPONSABLE) return null;
    return { createdById: user.id };
}

/** Liste des missions (page Missions) — le consolidateur voit les brouillons à valider. */
function missionListWhereForUser(user) {
    const ownOnly = responsableMissionScope(user);
    if (ownOnly) return ownOnly;
    if (isPrivilegedAdmin(user?.role)) {
        return { status: { not: 'CANCELLED' } };
    }
    const draftAsConsolidator = projectConsolidatorDraftMissionFilter(user);
    const pendingFinalize = missionPendingFinalizeFilter(user);
    return {
        OR: [
            { createdById: user.id },
            { assignments: { some: { userId: user.id } } },
            ...(draftAsConsolidator ? [draftAsConsolidator] : []),
            ...(pendingFinalize ? [pendingFinalize] : []),
        ],
    };
}

function requiresConsolidatorApproval(creatorRole) {
    return creatorRole === ROLES.RESPONSABLE;
}

/** Peut confirmer une mission (visible calendrier + notification intervenants). */
function canConfirmMission(mission, user) {
    if (!mission || !user) return false;
    if (isPrivilegedAdmin(user?.role)) {
        return mission.status === 'DRAFT' || isPendingCoordinatorValidation(mission.status);
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
    return canConsolidateDraftMission(mission, user);
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

/** Accès au détail d'une mission (aligné sur les filtres liste / calendrier). */
function canViewMissionForUser(mission, user) {
    if (!mission || !user?.id) return false;
    const ownOnly = responsableMissionScope(user);
    if (ownOnly) return mission.createdById === user.id;
    if (isPrivilegedAdmin(user.role)) return true;
    const draftAsConsolidator = projectConsolidatorDraftMissionFilter(user);
    if (
        draftAsConsolidator
        && mission.status === 'DRAFT'
        && mission.project?.consolidatorId === user.id
    ) {
        return true;
    }
    const pendingFinalize = missionPendingFinalizeFilter(user);
    if (
        pendingFinalize
        && isPendingCoordinatorValidation(mission.status)
        && (
            mission.project?.coordinatorId === user.id
            || (isGlobalConsolidatorRole(user) && !mission.project?.coordinatorId)
        )
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
    canFinalizeMission,
    canManageMission,
    canEditMission,
    canViewMissionForUser,
    responsableMissionScope,
};
