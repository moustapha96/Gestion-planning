/** Aligné sur backend/src/config/roles.js */
export const ROLES = {
    RESPONSABLE: 'RESPONSABLE',
    CONSOLIDATEUR: 'CONSOLIDATEUR',
    COORDINATEUR_PROJET: 'COORDINATEUR_PROJET',
    SECRETAIRE_GENERAL: 'SECRETAIRE_GENERAL',
    DG: 'DG',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
};

export function isPrivilegedAdmin(role) {
    return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

export function isSuperAdmin(role) {
    return role === ROLES.SUPER_ADMIN;
}

/** Suppression définitive / forcée (API avec ?force=1 ou ?permanent=1). */
export function canSuperAdminForceDelete(role) {
    return isSuperAdmin(role);
}

/** Suppression définitive réunion / mission (admin + super admin). */
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

/** Modifier une mission (admin peut aussi rouvrir une mission annulée via le formulaire). */
export function canEditMission(mission, user) {
    if (!canManageMission(mission, user)) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    return mission.status !== 'CANCELLED';
}

/** Répertoire : liste, édition, création de comptes (admin, super admin, DG). */
export function canManageRepertoire(role) {
    return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN || role === ROLES.DG;
}

/** Voir toutes les missions (liste, détail, calendrier) — aligné backend. */
export function canViewAllMissions(role) {
    return (
        isPrivilegedAdmin(role)
        || role === ROLES.CONSOLIDATEUR
        || role === ROLES.COORDINATEUR_PROJET
        || role === ROLES.DG
    );
}

/** Création de mission (responsable + admin). */
export function canCreateMission(role) {
    return role === ROLES.RESPONSABLE || isPrivilegedAdmin(role);
}

/** Utilisateur désigné consolidateur du projet lié à l'entité. */
export function isProjectConsolidator(entity, user) {
    if (!entity || !user?.id) return false;
    const consolidatorId = entity.consolidatorId
        ?? entity.project?.consolidatorId
        ?? entity.user?.project?.consolidatorId;
    return consolidatorId === user.id;
}

/** Consolider un planning soumis (rôle global ou consolidateur du projet du responsable). */
export function canConsolidatePlanning(planning, user) {
    if (!planning || planning.status !== 'SUBMITTED' || !user) return false;
    if (isPrivilegedAdmin(user.role) || user.role === ROLES.CONSOLIDATEUR) return true;
    return isProjectConsolidator(planning, user);
}

/** Valider / publier une réunion en brouillon (consolidateur du projet ou rôle global). */
export function canApproveMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const organizerRole = meeting.organizer?.role;
    if (organizerRole === ROLES.RESPONSABLE) {
        if (user.role === ROLES.CONSOLIDATEUR) return true;
        return isProjectConsolidator(meeting, user);
    }
    return meeting.organizerId === user.id;
}

/** Au moins un projet a cet utilisateur comme consolidateur désigné. */
export function userConsolidatesAnyProject(projects, userId) {
    return (projects || []).some((p) => p.consolidatorId === userId);
}

export function meetingNeedsConsolidatorApproval(meeting) {
    return meeting?.status === 'DRAFT' && meeting?.organizer?.role === ROLES.RESPONSABLE;
}
