const { ROLES, isPrivilegedAdmin, canViewAllPlannings } = require('../config/roles');
const {
    isPendingConsolidatorValidation,
    isPendingCoordinatorValidation,
} = require('../config/planningWorkflow');

function isGlobalConsolidatorRole(user) {
    return normalizeRole(user?.storedRole || user?.role) === ROLES.CONSOLIDATEUR;
}

function normalizeRole(role) {
    if (role === 'COORDINATEUR_PROJET') return ROLES.COORDINATEUR;
    if (role === 'SECRETAIRE_GENERAL') return ROLES.ADMIN;
    return role;
}

/** Consolidation étape 2 (sync) : projet → direction → rôle global. */
function canConsolidateInContext(user, { project, directionId, directionConsolidatorIds = [] } = {}) {
    if (!user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (project?.consolidatorId) {
        return project.consolidatorId === user.id;
    }
    const dirIds = Array.isArray(directionConsolidatorIds) ? directionConsolidatorIds : [];
    if (directionId && dirIds.length > 0) {
        return dirIds.includes(user.id);
    }
    return isGlobalConsolidatorRole(user);
}

async function userCanSeeValidationMenu(prisma, user) {
    const { userCanAccessValidationMenuExtended } = require('./consolidatorResolution.service');
    return userCanAccessValidationMenuExtended(prisma, user);
}

function isUserProjectCoordinator(user, project) {
    if (!user?.id || !project) return false;
    return project.coordinatorId === user.id;
}

/** Utilisateur désigné consolidateur sur le projet (fiche projet). */
function isUserProjectConsolidator(user, project) {
    if (!user?.id || !project?.consolidatorId) return false;
    return project.consolidatorId === user.id;
}

function projectHasConsolidator(project) {
    return Boolean(project?.consolidatorId);
}

function projectHasCoordinator(project) {
    return Boolean(project?.coordinatorId);
}

/** Consolidation étape 2 : consolidateur projet → direction → rôle global. */
function canConsolidateForContext(user, context) {
    return canConsolidateInContext(user, context);
}

/** @deprecated alias */
function canConsolidateForProject(user, project, directionId, directionConsolidatorIds) {
    return canConsolidateInContext(user, {
        project,
        directionId,
        directionConsolidatorIds,
    });
}

function projectNeedsGlobalConsolidatorFallback(project) {
    if (!project) return true;
    return !projectHasConsolidator(project);
}

/**
 * 1er palier réunion (DRAFT) : coordinateur du projet.
 * Passe en CONSOLIDATOR_PENDING — pas de publication calendrier.
 * Toute réunion doit passer par ce circuit, quel que soit le rôle de l'organisateur (pas d'exception).
 */
function canCoordinateDraftMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = meeting.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/**
 * 2e palier réunion (CONSOLIDATOR_PENDING) : consolidateur du projet
 * ou rôle Consolidateur global si aucun consolidateur désigné.
 */
function canConsolidatePendingMeeting(meeting, user) {
    if (!meeting || !isPendingConsolidatorValidation(meeting.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return canConsolidateInContext(user, {
        project: meeting.project || null,
        directionId: meeting.directionId || null,
        directionConsolidatorIds: meeting._directionConsolidatorIds || [],
    });
}

/** Publication directe depuis DRAFT interdite — circuit obligatoire pour tous. */
function canApproveDraftMeeting() {
    return false;
}

/**
 * Legacy : coordinateur finalise les réunions restées en COORDINATOR_PENDING (ancien flux).
 */
function canFinalizePendingMeeting(meeting, user) {
    if (!meeting || !isPendingCoordinatorValidation(meeting.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = meeting.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/** @deprecated alias — utiliser canConsolidatePendingMeeting */
function canConsolidateDraftMeeting(meeting, user) {
    return canConsolidatePendingMeeting(meeting, user);
}

/** Toute mission doit passer par ce circuit, quel que soit le rôle du créateur (pas d'exception). */
function canCoordinateDraftMission(mission, user) {
    if (!mission || mission.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = mission.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

function canConsolidatePendingMission(mission, user) {
    if (!mission || !isPendingConsolidatorValidation(mission.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return canConsolidateInContext(user, {
        project: mission.project || null,
        directionId: mission.directionId || null,
        directionConsolidatorIds: mission._directionConsolidatorIds || [],
    });
}

/** Publication directe depuis DRAFT interdite — circuit obligatoire pour tous. */
function canApproveDraftMission() {
    return false;
}

function canFinalizePendingMission(mission, user) {
    if (!mission || !isPendingCoordinatorValidation(mission.status) || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = mission.project || null;
    return projectHasCoordinator(project) && isUserProjectCoordinator(user, project);
}

/** @deprecated alias — utiliser canConsolidatePendingMission */
function canConsolidateDraftMission(mission, user) {
    return canConsolidatePendingMission(mission, user);
}

function missionValidationAction(mission) {
    if (mission.status === 'DRAFT') return 'coordinate';
    if (isPendingConsolidatorValidation(mission.status)) return 'consolidate';
    if (isPendingCoordinatorValidation(mission.status)) return 'coordinate';
    return null;
}

function meetingValidationAction(meeting) {
    if (meeting.status === 'DRAFT') return 'coordinate';
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

/** 2e palier planning (CONSOLIDATOR_PENDING) : consolidateur du projet ou rôle global. */
function canConsolidatePendingPlanning(planning, user) {
    if (!planning || !user) return false;
    if (!isPendingConsolidatorValidation(planning.status)) return false;
    const project = planning.user?.project || planning.project || null;
    const directionId = planning.user?.directionId || planning._directionId || null;
    return canConsolidateInContext(user, {
        project,
        directionId,
        directionConsolidatorIds: planning._directionConsolidatorIds || [],
    });
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
    if (isUserProjectConsolidator(user, project)) return true;
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
    isUserProjectConsolidator,
    canConsolidateForContext,
    canConsolidateForProject,
    projectHasConsolidator,
    projectHasCoordinator,
    projectNeedsGlobalConsolidatorFallback,
    canConsolidateInContext,
    userCanSeeValidationMenu,
    canCoordinateDraftMeeting,
    canConsolidatePendingMeeting,
    canConsolidateDraftMeeting,
    canApproveDraftMeeting,
    canFinalizePendingMeeting,
    meetingValidationAction,
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
