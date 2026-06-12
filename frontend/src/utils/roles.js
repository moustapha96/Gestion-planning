/** Aligné sur backend/src/config/roles.js */
export const ROLES = {
    RESPONSABLE: 'RESPONSABLE',
    CONSOLIDATEUR: 'CONSOLIDATEUR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
};

/** Anciens rôles (affichage / migration). */
export const LEGACY_ROLE_LABELS = {
    COORDINATEUR_PROJET: 'Coordinateur (ancien)',
    SECRETAIRE_GENERAL: 'Secrétaire général (ancien)',
    DG: 'Direction générale (ancien)',
};

export function normalizeRole(role) {
    if (role === 'COORDINATEUR_PROJET') return ROLES.CONSOLIDATEUR;
    if (role === 'SECRETAIRE_GENERAL' || role === 'DG') return ROLES.ADMIN;
    return role;
}

export function isPrivilegedAdmin(role) {
    const r = normalizeRole(role);
    return r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN;
}

export function isSuperAdmin(role) {
    return normalizeRole(role) === ROLES.SUPER_ADMIN;
}

export function canSuperAdminForceDelete(role) {
    return isSuperAdmin(role);
}

export function canPrivilegedForceDelete(role) {
    return isPrivilegedAdmin(role);
}

export function canManageMeeting(meeting, user) {
    if (!meeting || !user?.id) return false;
    return meeting.organizerId === user.id || isPrivilegedAdmin(user.role);
}

export function canEditMeeting(meeting, user) {
    if (!canManageMeeting(meeting, user)) return false;
    return meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED';
}

export function canManageMission(mission, user) {
    if (!mission || !user?.id) return false;
    return mission.createdById === user.id || isPrivilegedAdmin(user.role);
}

export function canEditMission(mission, user) {
    if (!canManageMission(mission, user)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return mission.status !== 'CANCELLED';
}

export function canAccessRepertoire(role) {
    const r = normalizeRole(role);
    return r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN || r === ROLES.CONSOLIDATEUR || r === ROLES.RESPONSABLE;
}

export function canManageProjects(role) {
    const r = normalizeRole(role);
    return r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN;
}

export function canManageRepertoire(role) {
    const r = normalizeRole(role);
    return r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN;
}

export function isResponsable(role) {
    return normalizeRole(role) === ROLES.RESPONSABLE;
}

/** Capacités dérivées de la config direction + intitulé de poste (voir Admin → Rôles). */
export function userMayConsolidate(user) {
    if (!user) return false;
    if (normalizeRole(user.storedRole || user.role) === ROLES.CONSOLIDATEUR) return true;
    return Boolean(user.functionalCapabilities?.mayConsolidate);
}

export function userMayCoordinateProject(user) {
    return Boolean(user?.functionalCapabilities?.mayCoordinateProject);
}

export function userMayActAsServiceDirector(user) {
    return Boolean(user?.functionalCapabilities?.mayActAsServiceDirector);
}

export function canViewAllMissions(roleOrUser) {
    if (roleOrUser && typeof roleOrUser === 'object') {
        const r = normalizeRole(roleOrUser.role);
        return isPrivilegedAdmin(r) || userMayConsolidate(roleOrUser);
    }
    const r = normalizeRole(roleOrUser);
    return isPrivilegedAdmin(r) || r === ROLES.CONSOLIDATEUR;
}

export function canCreateMission(role) {
    return isResponsable(role) || isPrivilegedAdmin(role);
}

export function isProjectConsolidator(entity, user) {
    if (!entity || !user?.id) return false;
    const consolidatorId = entity.consolidatorId
        ?? entity.project?.consolidatorId
        ?? entity.user?.project?.consolidatorId;
    return consolidatorId === user.id;
}

export function isProjectCoordinator(entity, user) {
    if (!entity || !user?.id) return false;
    const coordinatorId = entity.coordinatorId
        ?? entity.project?.coordinatorId
        ?? entity.user?.project?.coordinatorId;
    return coordinatorId === user.id;
}

function planningValidationFlags(planning) {
    return planning?.validation || null;
}

export function canConsolidatePlanning(planning, user) {
    const fromApi = planningValidationFlags(planning);
    if (fromApi && typeof fromApi.canConsolidate === 'boolean') return fromApi.canConsolidate;
    if (!planning || planning.status !== 'SUBMITTED' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = planning.user?.project || planning.project || fromApi?.project;
    if (!project?.consolidatorId) return false;
    return isProjectConsolidator({ ...planning, user: { ...planning.user, project } }, user);
}

const PENDING_COORDINATOR = ['COORDINATOR_PENDING', 'CP_PENDING', 'SG_PENDING', 'DG_PENDING', 'IN_CONSOLIDATION'];

export function isPendingCoordinatorStatus(status) {
    return PENDING_COORDINATOR.includes(status);
}

export function canCoordinatePlanning(planning, user) {
    const fromApi = planningValidationFlags(planning);
    if (fromApi && typeof fromApi.canCoordinate === 'boolean') return fromApi.canCoordinate;
    if (!planning || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const project = planning.user?.project || planning.project || fromApi?.project;
    const status = planning.status;
    const pending = isPendingCoordinatorStatus(status);
    const entity = project ? { ...planning, user: { ...planning.user, project } } : planning;

    if (project?.consolidatorId) {
        if (!pending) return false;
        if (project.coordinatorId) return isProjectCoordinator(entity, user);
        return normalizeRole(user.role) === ROLES.CONSOLIDATEUR;
    }
    if (project?.coordinatorId) {
        if (status !== 'SUBMITTED' && !pending) return false;
        return isProjectCoordinator(entity, user);
    }
    if (status !== 'SUBMITTED' && !pending) return false;
    return normalizeRole(user.role) === ROLES.CONSOLIDATEUR;
}

export function planningValidationHint(planning) {
    return planningValidationFlags(planning)?.hint || null;
}

export function planningAutoFinalizeOnConsolidate(planning) {
    return Boolean(planningValidationFlags(planning)?.autoFinalizeOnConsolidate);
}

export function canReturnPlanning(planning, user) {
    const fromApi = planningValidationFlags(planning);
    if (fromApi && typeof fromApi.canReturn === 'boolean') return fromApi.canReturn;
    return canCoordinatePlanning(planning, user);
}

/** Accès lecture au détail d'un planning (aligné backend canUserViewPlanning). */
export function canViewPlanningDetail(planning, user) {
    if (!planning || !user?.id) return false;
    if (planning.userId === user.id) return true;
    if (isPrivilegedAdmin(user.role)) return true;
    if (normalizeRole(user.role) === ROLES.CONSOLIDATEUR) return true;
    const project = planning.user?.project || planning.project;
    if (project?.consolidatorId === user.id || project?.coordinatorId === user.id) return true;
    if (canConsolidatePlanning(planning, user) || canCoordinatePlanning(planning, user)) return true;
    return false;
}

export function canConsolidateMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const organizerRole = normalizeRole(meeting.organizer?.role);
    if (organizerRole !== ROLES.RESPONSABLE) return false;
    const project = meeting.project;
    if (!project?.consolidatorId) return false;
    return isProjectConsolidator(meeting, user);
}

export function canApproveMeeting(meeting, user) {
    if (!meeting || !user) return false;
    if (isPrivilegedAdmin(user.role)) {
        return meeting.status === 'DRAFT' || isPendingCoordinatorStatus(meeting.status);
    }
    const organizerRole = normalizeRole(meeting.organizer?.role);
    if (organizerRole === ROLES.RESPONSABLE) {
        const project = meeting.project;
        if (meeting.status === 'DRAFT') {
            if (project?.consolidatorId) return false;
            if (project?.coordinatorId) return isProjectCoordinator(meeting, user);
            return normalizeRole(user.role) === ROLES.CONSOLIDATEUR;
        }
        if (isPendingCoordinatorStatus(meeting.status)) {
            if (project?.coordinatorId) return isProjectCoordinator(meeting, user);
            return normalizeRole(user.role) === ROLES.CONSOLIDATEUR;
        }
        return false;
    }
    return meeting.status === 'DRAFT' && meeting.organizerId === user.id;
}

export function canFinalizeMeeting(meeting, user) {
    if (!meeting || !user) return false;
    if (!isPendingCoordinatorStatus(meeting.status)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const organizerRole = normalizeRole(meeting.organizer?.role);
    if (organizerRole !== ROLES.RESPONSABLE) return false;
    const project = meeting.project;
    if (project?.coordinatorId) return isProjectCoordinator(meeting, user);
    return normalizeRole(user.role) === ROLES.CONSOLIDATEUR;
}

export function userConsolidatesAnyProject(projects, userId) {
    return (projects || []).some((p) => p.consolidatorId === userId);
}

export function userCoordinatesAnyProject(projects, userId) {
    return (projects || []).some((p) => p.coordinatorId === userId);
}

export function meetingNeedsConsolidatorApproval(meeting) {
    return meeting?.status === 'DRAFT' && normalizeRole(meeting?.organizer?.role) === ROLES.RESPONSABLE;
}

/** Désigné consolidateur ou coordinateur sur au moins un projet (fiche projet). */
export function userAssignedOnAnyProject(projects, userId) {
    return userConsolidatesAnyProject(projects, userId) || userCoordinatesAnyProject(projects, userId);
}

/** Menu « À valider » : admin, rôle Consolidateur, ou désigné sur un projet. */
export function userCanSeeValidationMenu(user, projects = []) {
    if (!user?.id) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (normalizeRole(user.role) === ROLES.CONSOLIDATEUR) return true;
    return userAssignedOnAnyProject(projects, user.id);
}
