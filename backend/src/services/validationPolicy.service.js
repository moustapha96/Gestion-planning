const { ROLES, isPrivilegedAdmin, canViewAllPlannings } = require('../config/roles');
const {
    isPendingConsolidatorValidation,
    isPendingCoordinatorValidation,
} = require('../config/planningWorkflow');

function isUserProjectCoordinator(user, project) {
    if (!user?.id || !project) return false;
    return project.coordinatorId === user.id;
}

function normalizeRole(role) {
    if (role === 'COORDINATEUR_PROJET') return ROLES.CONSOLIDATEUR;
    if (role === 'SECRETAIRE_GENERAL' || role === 'DG') return ROLES.ADMIN;
    return role;
}

/** Utilisateur au rôle Consolidateur (validation globale étape 2). */
function isGlobalConsolidatorRole(user) {
    return normalizeRole(user?.storedRole || user?.role) === ROLES.CONSOLIDATEUR;
}

/** @deprecated Plus de consolidateur par projet — conservé pour compatibilité schéma / affichage. */
function projectHasConsolidator(_project) {
    return false;
}

function projectHasCoordinator(project) {
    return Boolean(project?.coordinatorId);
}

/** @deprecated */
function projectNeedsGlobalConsolidatorFallback(project) {
    if (!project) return true;
    return !projectHasCoordinator(project);
}

/** Accès au menu / page « À valider ». */
async function userCanSeeValidationMenu(prisma, user) {
    if (!user?.id) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (isGlobalConsolidatorRole(user)) return true;
    const asCoordinator = await prisma.project.count({
        where: { coordinatorId: user.id, isActive: true },
    });
    return asCoordinator > 0;
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
 * 1er palier réunion (DRAFT) : coordinateur du projet.
 * Passe en CONSOLIDATOR_PENDING — pas de publication calendrier.
 */
function canCoordinateDraftMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (!meetingOrganizerNeedsApproval(meeting)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = meeting.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/**
 * 2e palier réunion (CONSOLIDATOR_PENDING) : rôle Consolidateur global.
 */
function canConsolidatePendingMeeting(meeting, user) {
    if (!meeting || !isPendingConsolidatorValidation(meeting.status) || !user) return false;
    if (!meetingOrganizerNeedsApproval(meeting)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return isGlobalConsolidatorRole(user);
}

/** Publication directe depuis DRAFT : uniquement si le créateur n'est pas responsable. */
function canApproveDraftMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!meetingOrganizerNeedsApproval(meeting)) {
        return meeting.organizerId === user.id;
    }
    return false;
}

/**
 * Legacy : coordinateur finalise les réunions restées en COORDINATOR_PENDING (ancien flux).
 */
function canFinalizePendingMeeting(meeting, user) {
    if (!meeting || !isPendingCoordinatorValidation(meeting.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!meetingOrganizerNeedsApproval(meeting)) return false;
    const project = meeting.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/** @deprecated alias — utiliser canConsolidatePendingMeeting */
function canConsolidateDraftMeeting(meeting, user) {
    return canConsolidatePendingMeeting(meeting, user);
}

function canCoordinateDraftMission(mission, user) {
    if (!mission || mission.status !== 'DRAFT' || !user) return false;
    if (!missionCreatorNeedsApproval(mission)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = mission.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

function canConsolidatePendingMission(mission, user) {
    if (!mission || !isPendingConsolidatorValidation(mission.status) || !user) return false;
    if (!missionCreatorNeedsApproval(mission)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return isGlobalConsolidatorRole(user);
}

function canApproveDraftMission(mission, user) {
    if (!mission || mission.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!missionCreatorNeedsApproval(mission)) {
        return mission.createdById === user.id;
    }
    return false;
}

function canFinalizePendingMission(mission, user) {
    if (!mission || !isPendingCoordinatorValidation(mission.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!missionCreatorNeedsApproval(mission)) return false;
    const project = mission.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/** @deprecated alias — utiliser canConsolidatePendingMission */
function canConsolidateDraftMission(mission, user) {
    return canConsolidatePendingMission(mission, user);
}

function missionValidationAction(mission) {
    if (mission.status === 'DRAFT' && missionCreatorNeedsApproval(mission)) return 'coordinate';
    if (isPendingConsolidatorValidation(mission.status)) return 'consolidate';
    if (isPendingCoordinatorValidation(mission.status)) return 'coordinate';
    return null;
}

function meetingValidationAction(meeting) {
    if (meeting.status === 'DRAFT' && meetingOrganizerNeedsApproval(meeting)) return 'coordinate';
    if (isPendingConsolidatorValidation(meeting.status)) return 'consolidate';
    if (isPendingCoordinatorValidation(meeting.status)) return 'coordinate';
    return null;
}

/** 1er palier planning (SUBMITTED) : coordinateur du projet. */
function canCoordinateSubmittedPlanning(planning, user) {
    if (!planning || planning.status !== 'SUBMITTED' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = planning.user?.project || planning.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/** 2e palier planning (CONSOLIDATOR_PENDING) : rôle Consolidateur global. */
function canConsolidatePendingPlanning(planning, user) {
    if (!planning || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!isPendingConsolidatorValidation(planning.status)) return false;
    return isGlobalConsolidatorRole(user);
}

/** Legacy : coordinateur finalise les plannings en COORDINATOR_PENDING (ancien flux). */
function canValidatePlanningAsCoordinator(planning, user) {
    if (!planning || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (!isPendingCoordinatorValidation(planning.status)) return false;
    const project = planning.user?.project || planning.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/** @deprecated alias — utiliser canConsolidatePendingPlanning */
function canConsolidateSubmittedPlanning(planning, user) {
    return canConsolidatePendingPlanning(planning, user);
}

function canUserViewPlanning(planning, user) {
    if (!planning || !user?.id) return false;
    if (planning.userId === user.id) return true;
    if (isPrivilegedAdmin(user.role)) return true;
    if (canViewAllPlannings(user.role)) return true;

    const project = planning.user?.project || planning.project || null;
    if (isUserProjectCoordinator(user, project)) return true;
    if (canCoordinateSubmittedPlanning(planning, user)) return true;
    if (canConsolidatePendingPlanning(planning, user)) return true;
    if (canValidatePlanningAsCoordinator(planning, user)) return true;
    if (isGlobalConsolidatorRole(user) && planning.status === 'DRAFT') return true;

    return false;
}

function planningValidationActionLabel(planning) {
    if (planning?.status === 'SUBMITTED') return 'coordinator';
    if (isPendingConsolidatorValidation(planning?.status)) return 'consolidator';
    if (isPendingCoordinatorValidation(planning?.status)) return 'coordinator';
    return null;
}

module.exports = {
    isGlobalConsolidatorRole,
    projectHasConsolidator,
    projectHasCoordinator,
    projectNeedsGlobalConsolidatorFallback,
    userCanSeeValidationMenu,
    meetingOrganizerNeedsApproval,
    canCoordinateDraftMeeting,
    canConsolidatePendingMeeting,
    canConsolidateDraftMeeting,
    canApproveDraftMeeting,
    canFinalizePendingMeeting,
    meetingValidationAction,
    missionCreatorNeedsApproval,
    canCoordinateDraftMission,
    canConsolidatePendingMission,
    canConsolidateDraftMission,
    canApproveDraftMission,
    canFinalizePendingMission,
    missionValidationAction,
    canCoordinateSubmittedPlanning,
    canConsolidatePendingPlanning,
    canConsolidateSubmittedPlanning,
    canValidatePlanningAsCoordinator,
    canUserViewPlanning,
    planningValidationActionLabel,
};
