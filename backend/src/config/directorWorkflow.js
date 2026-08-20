const DIRECTOR_PENDING_STATUS = 'PENDING_DIRECTOR_APPROVAL';
const DIRECTOR_APPROVED_STATUS = 'APPROVED';
const DIRECTOR_AUTO_APPROVED_STATUS = 'AUTO_APPROVED';
const DIRECTOR_REJECTED_STATUS = 'REJECTED';

const DIRECTOR_CALENDAR_STATUSES = [DIRECTOR_APPROVED_STATUS, DIRECTOR_AUTO_APPROVED_STATUS];
const DIRECTOR_HIDDEN_STATUSES = [DIRECTOR_PENDING_STATUS, DIRECTOR_REJECTED_STATUS];

const DIRECTION_EXCLUSIVE_ROLES = ['DG', 'ASSISTANT'];
const DIRECTOR_ELIGIBLE_ROLES = ['DG', 'ADMIN', 'SUPER_ADMIN'];

const ATTACHMENT_ERRORS = {
    ALREADY_ATTACHED: 'Cet utilisateur est déjà rattaché à une autre direction. Un utilisateur DG ou ASSISTANT ne peut appartenir qu\'à une seule direction.',
    ALREADY_DG: 'Cet utilisateur est déjà DG d\'une autre direction. Un DG ne peut être rattaché qu\'à une seule direction.',
    ALREADY_ASSISTANT: 'Cet utilisateur est déjà Assistant d\'une autre direction. Un Assistant ne peut appartenir qu\'à une seule direction.',
    CROSS_ROLE: 'Cet utilisateur possède déjà un rattachement DG ou ASSISTANT sur une autre direction. Modifiez d\'abord son rattachement actuel.',
    DIRECTION_HAS_DG: 'Cette direction a déjà un DG. Remplacez-le explicitement avant d\'en affecter un autre.',
    DIRECTION_REQUIRED: 'Un utilisateur ASSISTANT doit être rattaché à une direction.',
    NOT_DG_OF_DIRECTION: 'Vous n\'êtes pas le DG de la direction concernée.',
    CANNOT_SELF_APPROVE: 'Un Assistant ne peut pas valider sa propre demande.',
    ACCESS_DENIED: 'Accès refusé.',
    INVALID_DIRECTOR_ROLE: 'Le DG d\'une direction doit avoir le rôle DG, Directeur, Administrateur ou Super administrateur.',
};

function isDirectionExclusiveRole(role) {
    return DIRECTION_EXCLUSIVE_ROLES.includes(role);
}

function isDirecteurJobTitle(jobTitle) {
    return /directeur/i.test(String(jobTitle || '').trim());
}

function isEligibleDirectionDirector(user) {
    const role = String(user?.role || '');
    if (DIRECTOR_ELIGIBLE_ROLES.includes(role)) return true;
    return isDirecteurJobTitle(user?.jobTitle);
}

function directorRoleToKeep(user) {
    const role = String(user?.role || '');
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return role;
    return 'DG';
}

function isDirectorCalendarStatus(status) {
    return DIRECTOR_CALENDAR_STATUSES.includes(status);
}

function isDirectorHiddenStatus(status) {
    return DIRECTOR_HIDDEN_STATUSES.includes(status);
}

/**
 * Règles d'unicité DG / ASSISTANT (pures, testables sans Prisma).
 * @param {{ id?: string, role?: string, directionId?: string|null }} user
 * @param {string} targetDirectionId
 * @param {'DG'|'ASSISTANT'} targetRole
 * @param {{ currentDirectorId?: string|null, replaceExisting?: boolean }} [opts]
 */
function assertExclusiveAttachment(user, targetDirectionId, targetRole, opts = {}) {
    const { currentDirectorId = null, replaceExisting = false } = opts;
    if (!user?.id) {
        return { ok: false, error: 'Utilisateur introuvable.', code: 'USER_NOT_FOUND' };
    }
    if (!targetDirectionId) {
        return { ok: false, error: ATTACHMENT_ERRORS.DIRECTION_REQUIRED, code: 'DIRECTION_REQUIRED' };
    }
    if (!isDirectionExclusiveRole(targetRole)) {
        return { ok: true };
    }

    const currentDirectionId = user.directionId || null;
    const currentRole = user.role || null;
    const alreadyExclusive = isDirectionExclusiveRole(currentRole);

    if (alreadyExclusive && currentDirectionId && currentDirectionId !== targetDirectionId && !replaceExisting) {
        if (currentRole === 'DG' && targetRole === 'DG') {
            return { ok: false, error: ATTACHMENT_ERRORS.ALREADY_DG, code: 'ALREADY_DG' };
        }
        if (currentRole === 'ASSISTANT' && targetRole === 'ASSISTANT') {
            return { ok: false, error: ATTACHMENT_ERRORS.ALREADY_ASSISTANT, code: 'ALREADY_ASSISTANT' };
        }
        if (currentRole !== targetRole) {
            return { ok: false, error: ATTACHMENT_ERRORS.CROSS_ROLE, code: 'CROSS_ROLE' };
        }
        return { ok: false, error: ATTACHMENT_ERRORS.ALREADY_ATTACHED, code: 'ALREADY_ATTACHED' };
    }

    if (targetRole === 'DG' && currentDirectorId && currentDirectorId !== user.id && !replaceExisting) {
        return { ok: false, error: ATTACHMENT_ERRORS.DIRECTION_HAS_DG, code: 'DIRECTION_HAS_DG' };
    }

    return { ok: true };
}

module.exports = {
    DIRECTOR_PENDING_STATUS,
    DIRECTOR_APPROVED_STATUS,
    DIRECTOR_AUTO_APPROVED_STATUS,
    DIRECTOR_REJECTED_STATUS,
    DIRECTOR_CALENDAR_STATUSES,
    DIRECTOR_HIDDEN_STATUSES,
    DIRECTION_EXCLUSIVE_ROLES,
    DIRECTOR_ELIGIBLE_ROLES,
    ATTACHMENT_ERRORS,
    isDirectionExclusiveRole,
    isDirecteurJobTitle,
    isEligibleDirectionDirector,
    directorRoleToKeep,
    isDirectorCalendarStatus,
    isDirectorHiddenStatus,
    assertExclusiveAttachment,
};
