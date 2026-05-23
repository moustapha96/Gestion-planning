const ROLES = {
    RESPONSABLE: 'RESPONSABLE',
    CONSOLIDATEUR: 'CONSOLIDATEUR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
};

/** Anciens rôles (migration) → rôle stocké. */
const LEGACY_ROLE_MAP = {
    COORDINATEUR_PROJET: ROLES.CONSOLIDATEUR,
    SECRETAIRE_GENERAL: ROLES.ADMIN,
    DG: ROLES.ADMIN,
};

const ALL_ROLES = [...Object.values(ROLES), ...Object.keys(LEGACY_ROLE_MAP)];

/** Routes administration (menu /admin). */
const ADMIN_ROUTE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/** Répertoire : consultation. */
const REPERTOIRE_VIEW_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CONSOLIDATEUR,
    ROLES.RESPONSABLE,
];

/** Répertoire : édition. */
const REPERTOIRE_MANAGE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/** Projets : création et modification. */
const PROJECT_MANAGE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/** Voir toutes les missions. */
const MISSION_VIEW_ALL_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CONSOLIDATEUR,
];

/** Voir tous les plannings. */
const PLANNING_VIEW_ALL_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CONSOLIDATEUR,
];

function normalizeStoredRole(role) {
    if (!role) return ROLES.RESPONSABLE;
    if (LEGACY_ROLE_MAP[role]) return LEGACY_ROLE_MAP[role];
    if (Object.values(ROLES).includes(role)) return role;
    return ROLES.RESPONSABLE;
}

function isValidRole(role) {
    const n = normalizeStoredRole(role);
    return Object.values(ROLES).includes(n);
}

function isPrivilegedAdmin(role) {
    const n = normalizeStoredRole(role);
    return n === ROLES.ADMIN || n === ROLES.SUPER_ADMIN;
}

function isSuperAdmin(role) {
    return normalizeStoredRole(role) === ROLES.SUPER_ADMIN;
}

function canSuperAdminForceDelete(role) {
    return isSuperAdmin(role);
}

function canAccessRepertoire(role) {
    return REPERTOIRE_VIEW_ROLES.includes(normalizeStoredRole(role));
}

function canManageRepertoire(role) {
    return REPERTOIRE_MANAGE_ROLES.includes(normalizeStoredRole(role));
}

function canManageProjects(role) {
    return PROJECT_MANAGE_ROLES.includes(normalizeStoredRole(role));
}

function canManageDirections(role) {
    return isPrivilegedAdmin(role);
}

function canViewAllMissions(role) {
    return MISSION_VIEW_ALL_ROLES.includes(normalizeStoredRole(role));
}

function canViewAllPlannings(role) {
    return PLANNING_VIEW_ALL_ROLES.includes(normalizeStoredRole(role));
}

function isResponsable(role) {
    return normalizeStoredRole(role) === ROLES.RESPONSABLE;
}

function missionScopeWhere(user) {
    if (canViewAllMissions(user?.role)) return {};
    const userId = user?.id;
    if (isResponsable(user?.role)) {
        return { createdById: userId };
    }
    return {
        OR: [
            { createdById: userId },
            { assignments: { some: { userId } } },
        ],
    };
}

function planningScopeWhere(user) {
    if (canViewAllPlannings(user?.role)) return {};
    return { userId: user.id };
}

function canViewMission(mission, user) {
    if (!mission || !user?.id) return false;
    if (canViewAllMissions(user.role)) return true;
    if (isResponsable(user.role)) return mission.createdById === user.id;
    return (
        mission.createdById === user.id
        || (mission.assignments || []).some((a) => a.userId === user.id)
    );
}

module.exports = {
    ROLES,
    LEGACY_ROLE_MAP,
    ALL_ROLES,
    ADMIN_ROUTE_ROLES,
    REPERTOIRE_VIEW_ROLES,
    REPERTOIRE_MANAGE_ROLES,
    PROJECT_MANAGE_ROLES,
    MISSION_VIEW_ALL_ROLES,
    PLANNING_VIEW_ALL_ROLES,
    normalizeStoredRole,
    isValidRole,
    isPrivilegedAdmin,
    isSuperAdmin,
    canSuperAdminForceDelete,
    canAccessRepertoire,
    canManageRepertoire,
    canManageProjects,
    canManageDirections,
    canViewAllMissions,
    canViewAllPlannings,
    isResponsable,
    missionScopeWhere,
    planningScopeWhere,
    canViewMission,
};
