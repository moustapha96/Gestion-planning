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

/** Valider / publier une réunion en brouillon (consolidateur si organisateur responsable). */
export function canApproveMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT' || !user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    const organizerRole = meeting.organizer?.role;
    if (organizerRole === ROLES.RESPONSABLE) {
        return user.role === ROLES.CONSOLIDATEUR;
    }
    return meeting.organizerId === user.id;
}

export function meetingNeedsConsolidatorApproval(meeting) {
    return meeting?.status === 'DRAFT' && meeting?.organizer?.role === ROLES.RESPONSABLE;
}
