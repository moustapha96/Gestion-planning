const ROLES = {
    RESPONSABLE: 'RESPONSABLE',
    CONSOLIDATEUR: 'CONSOLIDATEUR',
    /** Première étape de validation du planning (après consolidation). */
    COORDINATEUR_PROJET: 'COORDINATEUR_PROJET',
    /** Deuxième étape de validation du planning. */
    SECRETAIRE_GENERAL: 'SECRETAIRE_GENERAL',
    DG: 'DG',
    ADMIN: 'ADMIN',
    /** Accès total : même périmètre qu'ADMIN + audit messagerie, promotion du rôle, modération messages */
    SUPER_ADMIN: 'SUPER_ADMIN',
};

const ALL_ROLES = Object.values(ROLES);

/** Rôles autorisés sur les routes « administration » (pages /admin, /users, etc.) */
const ADMIN_ROUTE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/** Répertoire téléphonique : consultation / édition / création de comptes */
const REPERTOIRE_MANAGE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DG];

function isValidRole(role) {
    return ALL_ROLES.includes(role);
}

function isPrivilegedAdmin(role) {
    return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

function isSuperAdmin(role) {
    return role === ROLES.SUPER_ADMIN;
}

/** Suppression définitive / forcée (contournement des garde-fous métier). */
function canSuperAdminForceDelete(role) {
    return role === ROLES.SUPER_ADMIN;
}

function canManageRepertoire(role) {
    return REPERTOIRE_MANAGE_ROLES.includes(role);
}

/** Voir toutes les missions (pas seulement les siennes / assignées). */
const MISSION_VIEW_ALL_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CONSOLIDATEUR,
    ROLES.COORDINATEUR_PROJET,
    ROLES.DG,
];

function canViewAllMissions(role) {
    return MISSION_VIEW_ALL_ROLES.includes(role);
}

/** Filtre Prisma pour la liste / calendrier des missions. */
function missionScopeWhere(user) {
    if (canViewAllMissions(user?.role)) return {};
    const userId = user?.id;
    return {
        OR: [
            { createdById: userId },
            { assignments: { some: { userId } } },
        ],
    };
}

module.exports = {
    ROLES,
    ALL_ROLES,
    ADMIN_ROUTE_ROLES,
    REPERTOIRE_MANAGE_ROLES,
    isValidRole,
    isPrivilegedAdmin,
    isSuperAdmin,
    canSuperAdminForceDelete,
    canManageRepertoire,
    MISSION_VIEW_ALL_ROLES,
    canViewAllMissions,
    missionScopeWhere,
};
