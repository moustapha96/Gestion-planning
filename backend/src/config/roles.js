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

function isValidRole(role) {
    return ALL_ROLES.includes(role);
}

function isPrivilegedAdmin(role) {
    return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

function isSuperAdmin(role) {
    return role === ROLES.SUPER_ADMIN;
}

module.exports = {
    ROLES,
    ALL_ROLES,
    ADMIN_ROUTE_ROLES,
    isValidRole,
    isPrivilegedAdmin,
    isSuperAdmin,
};
