const { ROLES, isPrivilegedAdmin, canViewAllPlannings } = require('../config/roles');
const { isPendingCoordinatorValidation } = require('../config/planningWorkflow');

function isUserProjectConsolidator(user, project) {
    if (!user?.id || !project) return false;
    return project.consolidatorId === user.id;
}

function isUserProjectCoordinator(user, project) {
    if (!user?.id || !project) return false;
    return project.coordinatorId === user.id;
}

function normalizeRole(role) {
    if (role === 'COORDINATEUR_PROJET') return ROLES.CONSOLIDATEUR;
    if (role === 'SECRETAIRE_GENERAL' || role === 'DG') return ROLES.ADMIN;
    return role;
}

/** Utilisateur au rôle stocké Consolidateur (repli global). */
function isGlobalConsolidatorRole(user) {
    return normalizeRole(user?.storedRole || user?.role) === ROLES.CONSOLIDATEUR;
}

function projectHasConsolidator(project) {
    return Boolean(project?.consolidatorId);
}

function projectHasCoordinator(project) {
    return Boolean(project?.coordinatorId);
}

/** Projet sans consolidateur ni coordinateur désignés → repli rôle Consolidateur. */
function projectNeedsGlobalConsolidatorFallback(project) {
    if (!project) return true;
    return !projectHasConsolidator(project) && !projectHasCoordinator(project);
}

/** Accès au menu / page « À valider ». */
async function userCanSeeValidationMenu(prisma, user) {
    if (!user?.id) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (isGlobalConsolidatorRole(user)) return true;
    const [asConsolidator, asCoordinator] = await Promise.all([
        prisma.project.count({ where: { consolidatorId: user.id, isActive: true } }),
        prisma.project.count({ where: { coordinatorId: user.id, isActive: true } }),
    ]);
    return asConsolidator > 0 || asCoordinator > 0;
}

function meetingOrganizerNeedsApproval(meeting) {
    const role = meeting.organizer?.role;
    return role === ROLES.RESPONSABLE;
}

function missionCreatorNeedsApproval(mission) {
    const role = mission.createdBy?.role;
    return role === ROLES.RESPONSABLE;
}

/**
 * 1er palier réunion (DRAFT) : consolidation par le consolidateur du projet.
 * Ne publie pas — passe en attente de validation finale.
 */
function canConsolidateDraftMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (!meetingOrganizerNeedsApproval(meeting)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = meeting.project || null;
    if (!projectHasConsolidator(project)) return false;
    return isUserProjectConsolidator(user, project);
}

/**
 * Validation directe depuis DRAFT (pas de palier consolidateur sur le projet).
 * 1. Coordinateur du projet (si défini)
 * 2. Sinon rôle Consolidateur global
 */
function canApproveDraftMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!meetingOrganizerNeedsApproval(meeting)) {
        return meeting.organizerId === user.id;
    }
    const project = meeting.project || null;
    if (projectHasConsolidator(project)) return false;
    if (projectHasCoordinator(project)) {
        return isUserProjectCoordinator(user, project);
    }
    return isGlobalConsolidatorRole(user);
}

/**
 * 2e palier réunion (COORDINATOR_PENDING) : publication après consolidation.
 * 1. Coordinateur du projet (si défini)
 * 2. Sinon rôle Consolidateur global
 */
function canFinalizePendingMeeting(meeting, user) {
    if (!meeting || !isPendingCoordinatorValidation(meeting.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!meetingOrganizerNeedsApproval(meeting)) return false;
    const project = meeting.project || null;
    if (projectHasCoordinator(project)) {
        return isUserProjectCoordinator(user, project);
    }
    return isGlobalConsolidatorRole(user);
}

function canConsolidateDraftMission(mission, user) {
    if (!mission || mission.status !== 'DRAFT' || !user) return false;
    if (!missionCreatorNeedsApproval(mission)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = mission.project || null;
    if (!projectHasConsolidator(project)) return false;
    return isUserProjectConsolidator(user, project);
}

function canApproveDraftMission(mission, user) {
    if (!mission || mission.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!missionCreatorNeedsApproval(mission)) {
        return mission.createdById === user.id;
    }
    const project = mission.project || null;
    if (projectHasConsolidator(project)) return false;
    if (projectHasCoordinator(project)) {
        return isUserProjectCoordinator(user, project);
    }
    return isGlobalConsolidatorRole(user);
}

function canFinalizePendingMission(mission, user) {
    if (!mission || !isPendingCoordinatorValidation(mission.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!missionCreatorNeedsApproval(mission)) return false;
    const project = mission.project || null;
    if (projectHasCoordinator(project)) {
        return isUserProjectCoordinator(user, project);
    }
    return isGlobalConsolidatorRole(user);
}

function missionValidationAction(mission) {
    const project = mission.project || null;
    if (mission.status === 'DRAFT') {
        if (projectHasConsolidator(project)) return 'consolidate';
        if (projectHasCoordinator(project)) return 'coordinate';
        return 'fallback';
    }
    if (isPendingCoordinatorValidation(mission.status)) {
        if (projectHasCoordinator(project)) return 'coordinate';
        return 'fallback';
    }
    return null;
}

/** Action UI / file d'attente pour une réunion. */
function meetingValidationAction(meeting) {
    const project = meeting.project || null;
    if (meeting.status === 'DRAFT') {
        if (projectHasConsolidator(project)) return 'consolidate';
        if (projectHasCoordinator(project)) return 'coordinate';
        return 'fallback';
    }
    if (isPendingCoordinatorValidation(meeting.status)) {
        if (projectHasCoordinator(project)) return 'coordinate';
        return 'fallback';
    }
    return null;
}

/** Consolidation planning : uniquement si un consolidateur est désigné sur le projet. */
function canConsolidateSubmittedPlanning(planning, user) {
    if (!planning || planning.status !== 'SUBMITTED' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;

    const project = planning.user?.project || planning.project || null;
    if (!projectHasConsolidator(project)) return false;
    return isUserProjectConsolidator(user, project);
}

/**
 * Validation coordinateur (ou repli) :
 * - Coordinateur du projet si pas de consolidateur → peut valider dès SOUMIS
 * - Coordinateur du projet sinon → statuts attente coordinateur
 * - Sans consolidateur ni coordinateur → rôle Consolidateur global
 */
function canValidatePlanningAsCoordinator(planning, user) {
    if (!planning || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;

    const project = planning.user?.project || planning.project || null;
    const status = planning.status;

    if (projectHasConsolidator(project)) {
        if (!isPendingCoordinatorValidation(status)) return false;
        if (projectHasCoordinator(project)) {
            return isUserProjectCoordinator(user, project);
        }
        return isGlobalConsolidatorRole(user);
    }

    if (projectHasCoordinator(project)) {
        if (status !== 'SUBMITTED' && !isPendingCoordinatorValidation(status)) return false;
        return isUserProjectCoordinator(user, project);
    }

    if (projectNeedsGlobalConsolidatorFallback(project)) {
        if (status !== 'SUBMITTED' && !isPendingCoordinatorValidation(status)) return false;
        return isGlobalConsolidatorRole(user);
    }

    return false;
}

/** Lecture du détail planning : propriétaire, admin, rôle consolidateur global, désignés projet, validateurs du circuit. */
function canUserViewPlanning(planning, user) {
    if (!planning || !user?.id) return false;
    if (planning.userId === user.id) return true;
    if (isPrivilegedAdmin(user.role)) return true;
    if (canViewAllPlannings(user.role)) return true;

    const project = planning.user?.project || planning.project || null;
    if (isUserProjectConsolidator(user, project)) return true;
    if (isUserProjectCoordinator(user, project)) return true;
    if (canConsolidateSubmittedPlanning(planning, user)) return true;
    if (canValidatePlanningAsCoordinator(planning, user)) return true;

    return false;
}

/** Libellé de l'action de validation planning pour l'UI. */
function planningValidationActionLabel(planning) {
    const project = planning.user?.project || planning.project || null;
    if (projectHasConsolidator(project)) return 'coordinate';
    if (projectHasCoordinator(project)) return 'coordinate';
    return 'fallback';
}

module.exports = {
    isGlobalConsolidatorRole,
    projectHasConsolidator,
    projectHasCoordinator,
    projectNeedsGlobalConsolidatorFallback,
    userCanSeeValidationMenu,
    meetingOrganizerNeedsApproval,
    canConsolidateDraftMeeting,
    canApproveDraftMeeting,
    canFinalizePendingMeeting,
    meetingValidationAction,
    missionCreatorNeedsApproval,
    canConsolidateDraftMission,
    canApproveDraftMission,
    canFinalizePendingMission,
    missionValidationAction,
    canConsolidateSubmittedPlanning,
    canValidatePlanningAsCoordinator,
    canUserViewPlanning,
    planningValidationActionLabel,
};
