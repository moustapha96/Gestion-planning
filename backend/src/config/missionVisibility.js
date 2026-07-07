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

/** Missions visibles hors calendrier. */
const PUBLISHED_MISSION_STATUSES = ['CONFIRMED'];

/** Missions entièrement validées — seules autorisées sur le calendrier. */
const CALENDAR_MISSION_STATUSES = ['CONFIRMED'];

function isPublishedMissionStatus(status) {
    return PUBLISHED_MISSION_STATUSES.includes(status);
}

function isCalendarMissionStatus(status) {
    return CALENDAR_MISSION_STATUSES.includes(status);
}

function publishedMissionStatusFilter() {
    return { status: { in: PUBLISHED_MISSION_STATUSES } };
}

function calendarMissionStatusFilter() {
    return { status: { in: CALENDAR_MISSION_STATUSES } };
}

function coordinatorDraftMissionFilter(user) {
    if (!user?.id) return null;
    return {
        status: 'DRAFT',
        project: { coordinatorId: user.id },
    };
}

function consolidatorPendingMissionFilter(user) {
    if (!user?.id) return null;
    const orClauses = [{ project: { consolidatorId: user.id } }];
    if (user.directionId) {
        orClauses.push({
            OR: [
                {
                    directionId: user.directionId,
                    OR: [
                        { project: { is: null } },
                        { project: { consolidatorId: null } },
                    ],
                },
                {
                    project: {
                        consolidatorId: null,
                        OR: [
                            { responsible: { directionId: user.directionId } },
                            { coordinator: { directionId: user.directionId } },
                        ],
                    },
                },
            ],
        });
    }
    if (isGlobalConsolidatorRole(user)) {
        orClauses.push(
            { project: { is: null }, directionId: null },
            { project: { consolidatorId: null }, directionId: null },
        );
    }
    if (orClauses.length === 1) {
        return {
            status: 'CONSOLIDATOR_PENDING',
            ...orClauses[0],
        };
    }
    return {
        status: 'CONSOLIDATOR_PENDING',
        OR: orClauses,
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

/** Missions « personnelles » d'un utilisateur : créateur ou assigné. */
function ownMissionScope(user) {
    if (!user?.id) return null;
    return {
        OR: [
            { createdById: user.id },
            { assignments: { some: { userId: user.id } } },
        ],
    };
}

/**
 * Page « Missions » : chaque utilisateur ne voit QUE ses propres missions
 * (créateur ou assigné). Les missions à valider sont accessibles uniquement
 * via la page « À valider ». Les admins privilégiés voient tout.
 */
function missionListWhereForUser(user) {
    if (isPrivilegedAdmin(user?.role)) {
        return { status: { not: 'CANCELLED' } };
    }
    return ownMissionScope(user) || { createdById: '__none__' };
}

/** Toute mission doit passer par le circuit coordinateur → consolidateur, sans exception. */
function requiresConsolidatorApproval() {
    return true;
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
    if (mission.status === 'DRAFT') {
        return canCoordinateDraftMission(mission, user);
    }
    return false;
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
    if (isPrivilegedAdmin(user.role)) return true;
    if (
        mission.status === 'DRAFT'
        && mission.project?.coordinatorId === user.id
    ) {
        return true;
    }
    if (
        isPendingConsolidatorValidation(mission.status)
        && canConsolidatePendingMission(mission, user)
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
    CALENDAR_MISSION_STATUSES,
    isPublishedMissionStatus,
    isCalendarMissionStatus,
    publishedMissionStatusFilter,
    calendarMissionStatusFilter,
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
    ownMissionScope,
};
