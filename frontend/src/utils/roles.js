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
