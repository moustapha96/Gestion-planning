const { ROLES, isPrivilegedAdmin } = require('../config/roles');
const { isPendingConsolidatorValidation } = require('../config/planningWorkflow');
const { resolveUserFunctionalCapabilities } = require('./roleConfig.service');

function consolidatorServices() {
    return require('./projectConsolidator.service');
}

function isGlobalConsolidatorRole(user) {
    const { isGlobalConsolidatorRole: check } = require('./validationPolicy.service');
    return check(user);
}

function isUserProjectConsolidator(user, project) {
    if (!user?.id || !project?.consolidatorId) return false;
    return project.consolidatorId === user.id;
}

/**
 * Consolidation étape 2 (sync) : projet → direction → rôle global.
 * @param {string[]} [directionConsolidatorIds] — ids préchargés pour la direction
 */
function canConsolidateInContext(user, context) {
    const { canConsolidateInContext: check } = require('./validationPolicy.service');
    return check(user, context);
}

function hasPrimaryConsolidatorHandlers({ project, directionConsolidatorIds = [] } = {}) {
    if (project?.consolidatorId) return true;
    return directionConsolidatorIds.length > 0;
}

/** Utilisateur pouvant consolider pour sa direction (hors rôle global seul). */
async function userIsDirectionConsolidatorCandidate(prisma, user) {
    if (!user?.id || !user.directionId) return false;
    if (isGlobalConsolidatorRole(user)) return true;

    const [asProjectConsolidator, caps] = await Promise.all([
        prisma.project.count({
            where: { consolidatorId: user.id, isActive: true },
        }),
        resolveUserFunctionalCapabilities(prisma, {
            id: user.id,
            role: user.role,
            storedRole: user.storedRole,
            directionId: user.directionId,
            jobTitle: user.jobTitle,
        }),
    ]);

    return asProjectConsolidator > 0 || Boolean(caps?.mayConsolidate);
}

/** Consolidateurs prioritaires pour une direction (projet désigné, rôle ou profil fonctionnel). */
async function getDirectionConsolidatorUsers(prisma, directionId) {
    if (!directionId) return [];

    const { CONSOLIDATOR_USER_SELECT } = consolidatorServices();
    const candidates = await prisma.user.findMany({
        where: {
            directionId,
            isActive: true,
            isDeleted: false,
            OR: [
                { role: ROLES.CONSOLIDATEUR },
                { projectsAsConsolidator: { some: { isActive: true } } },
            ],
        },
        select: {
            ...CONSOLIDATOR_USER_SELECT,
            jobTitle: true,
            directionId: true,
        },
    });

    const result = [];
    for (const u of candidates) {
        if (u.role === ROLES.CONSOLIDATEUR) {
            result.push(u);
            continue;
        }
        const asProjectConsolidator = await prisma.project.count({
            where: { consolidatorId: u.id, isActive: true },
        });
        if (asProjectConsolidator > 0) {
            result.push(u);
            continue;
        }
        const caps = await resolveUserFunctionalCapabilities(prisma, u);
        if (caps?.mayConsolidate) result.push(u);
    }
    return result;
}

async function getDirectionConsolidatorUserIds(prisma, directionId) {
    const users = await getDirectionConsolidatorUsers(prisma, directionId);
    return users.map((u) => u.id);
}

async function resolveDirectionId(prisma, { directionId, ownerUserId, project, projectId } = {}) {
    if (directionId) return directionId;

    let proj = project;
    const pid = project?.id || projectId;
    if (pid && (!proj?.coordinatorId && !proj?.responsibleId)) {
        proj = await prisma.project.findUnique({
            where: { id: pid },
            select: {
                id: true,
                coordinatorId: true,
                responsibleId: true,
                consolidatorId: true,
            },
        }) || proj;
    }

    const loadUserDirection = async (userId) => {
        if (!userId) return null;
        const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { directionId: true },
        });
        return u?.directionId || null;
    };

    if (proj?.coordinatorId) {
        const dir = await loadUserDirection(proj.coordinatorId);
        if (dir) return dir;
    }
    if (proj?.responsibleId) {
        const dir = await loadUserDirection(proj.responsibleId);
        if (dir) return dir;
    }
    if (ownerUserId) {
        const dir = await loadUserDirection(ownerUserId);
        if (dir) return dir;
    }
    return null;
}

async function resolveConsolidatorScope(prisma, { projectId, directionId, ownerUserId, project } = {}) {
    const { getProjectConsolidator } = consolidatorServices();
    const resolvedDirectionId = await resolveDirectionId(prisma, {
        directionId,
        ownerUserId,
        project,
        projectId,
    });

    if (projectId) {
        const projectConsolidator = await getProjectConsolidator(prisma, projectId);
        if (projectConsolidator) {
            return { scope: 'project', scopeLabel: 'consolidateur du projet' };
        }
    }
    if (resolvedDirectionId) {
        const dirIds = await getDirectionConsolidatorUserIds(prisma, resolvedDirectionId);
        if (dirIds.length) {
            return { scope: 'direction', scopeLabel: 'consolidateur de la direction du projet' };
        }
    }
    return { scope: 'global', scopeLabel: 'consolidateur (rôle global)' };
}

/**
 * Destinataires consolidation : consolidateur projet → consolidateurs direction → rôle global.
 */
async function resolveConsolidatorRecipients(prisma, { projectId, directionId, ownerUserId, project } = {}) {
    const { getProjectConsolidator, getGlobalConsolidatorRoleUsers } = consolidatorServices();
    if (projectId) {
        const projectConsolidator = await getProjectConsolidator(prisma, projectId);
        if (projectConsolidator?.email) return [projectConsolidator];
    }

    const resolvedDirectionId = await resolveDirectionId(prisma, {
        directionId,
        ownerUserId,
        project,
        projectId,
    });
    if (resolvedDirectionId) {
        const directionConsolidators = await getDirectionConsolidatorUsers(prisma, resolvedDirectionId);
        const withEmail = directionConsolidators.filter((u) => u.email);
        if (withEmail.length) return withEmail;
    }

    const globalConsolidators = await getGlobalConsolidatorRoleUsers(prisma);
    return globalConsolidators.filter((u) => u.email);
}

function createConsolidationContextCache() {
    const directionIds = new Map();
    return {
        async getDirectionConsolidatorIds(prisma, directionId) {
            if (!directionId) return [];
            if (!directionIds.has(directionId)) {
                directionIds.set(
                    directionId,
                    await getDirectionConsolidatorUserIds(prisma, directionId),
                );
            }
            return directionIds.get(directionId);
        },
    };
}

async function resolveEntityConsolidationContext(prisma, entity, kind, cache) {
    const c = cache || createConsolidationContextCache();
    let project = null;
    let directionId = null;
    let ownerUserId = null;

    if (kind === 'meeting') {
        project = entity.project || null;
        directionId = entity.directionId || null;
        ownerUserId = entity.organizerId;
    } else if (kind === 'mission') {
        project = entity.project || null;
        directionId = entity.directionId || null;
        ownerUserId = entity.createdById;
    } else if (kind === 'planning') {
        project = entity.user?.project || entity.project || null;
        directionId = entity.user?.directionId || null;
        ownerUserId = entity.userId;
    }

    if (!directionId) {
        directionId = await resolveDirectionId(prisma, {
            directionId,
            ownerUserId,
            project,
            projectId: project?.id || null,
        });
    }

    const directionConsolidatorIds = await c.getDirectionConsolidatorIds(prisma, directionId);
    return { project, directionId, directionConsolidatorIds };
}

async function canUserConsolidateEntity(prisma, user, entity, kind, cache) {
    if (!entity || !user) return false;
    if (!isPendingConsolidatorValidation(entity.status)) return false;

    const organizerRole = entity.organizer?.role || entity.createdBy?.role;
    if (organizerRole && organizerRole !== ROLES.RESPONSABLE) return false;

    const ctx = await resolveEntityConsolidationContext(prisma, entity, kind, cache);
    return canConsolidateInContext(user, ctx);
}

/** Clause Prisma pour la file « À valider » (étape consolidateur). */
async function buildConsolidatorPendingScope(prisma, user) {
    if (isPrivilegedAdmin(user.role)) return null;

    const orClauses = [{ project: { consolidatorId: user.id } }];

    if (user.directionId && await userIsDirectionConsolidatorCandidate(prisma, user)) {
        orClauses.push({
            OR: [
                {
                    directionId: user.directionId,
                    OR: [
                        { project: { is: null } },
                        { project: { consolidatorId: null } },
                    ],
                },
                {
                    project: {
                        consolidatorId: null,
                        OR: [
                            { responsible: { directionId: user.directionId } },
                            { coordinator: { directionId: user.directionId } },
                        ],
                    },
                },
            ],
        });
    }

    if (isGlobalConsolidatorRole(user)) {
        return null;
    }

    if (orClauses.length === 1) return orClauses[0];
    return { OR: orClauses };
}

async function userCanAccessValidationMenuExtended(prisma, user) {
    if (!user?.id) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (isGlobalConsolidatorRole(user)) return true;
    if (await userIsDirectionConsolidatorCandidate(prisma, user)) return true;

    const [asCoordinator, asConsolidator] = await Promise.all([
        prisma.project.count({ where: { coordinatorId: user.id, isActive: true } }),
        prisma.project.count({ where: { consolidatorId: user.id, isActive: true } }),
    ]);
    return asCoordinator > 0 || asConsolidator > 0;
}

async function buildPlanningConsolidatorScope(prisma, user) {
    if (isPrivilegedAdmin(user.role)) return null;

    const orClauses = [{ user: { project: { consolidatorId: user.id } } }];

    if (user.directionId && await userIsDirectionConsolidatorCandidate(prisma, user)) {
        orClauses.push({
            OR: [
                {
                    user: {
                        directionId: user.directionId,
                        OR: [
                            { projectId: null },
                            { project: { consolidatorId: null } },
                        ],
                    },
                },
                {
                    user: {
                        project: {
                            consolidatorId: null,
                            OR: [
                                { responsible: { directionId: user.directionId } },
                                { coordinator: { directionId: user.directionId } },
                            ],
                        },
                    },
                },
            ],
        });
    }

    if (isGlobalConsolidatorRole(user)) return null;
    if (orClauses.length === 1) return orClauses[0];
    return { OR: orClauses };
}

module.exports = {
    isGlobalConsolidatorRole,
    isUserProjectConsolidator,
    canConsolidateInContext,
    hasPrimaryConsolidatorHandlers,
    userIsDirectionConsolidatorCandidate,
    getDirectionConsolidatorUsers,
    getDirectionConsolidatorUserIds,
    resolveDirectionId,
    resolveConsolidatorScope,
    resolveConsolidatorRecipients,
    createConsolidationContextCache,
    resolveEntityConsolidationContext,
    canUserConsolidateEntity,
    buildConsolidatorPendingScope,
    buildPlanningConsolidatorScope,
    userCanAccessValidationMenuExtended,
};
