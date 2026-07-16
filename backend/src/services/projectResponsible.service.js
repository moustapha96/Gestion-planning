const { ROLES, isCoordinateur, isResponsable, isPrivilegedAdmin } = require('../config/roles');
const { logger } = require('../utils/logger');

const RESPONSIBLE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    isDeleted: true,
    projectId: true,
};

const PROJECT_RESPONSIBLE_INCLUDE = {
    responsible: { select: RESPONSIBLE_USER_SELECT },
};

async function validateResponsibleId(prisma, responsibleId) {
    if (responsibleId === undefined) return { ok: true };
    if (responsibleId === null || responsibleId === '') return { ok: true, value: null };
    const user = await prisma.user.findFirst({
        where: {
            id: responsibleId,
            isDeleted: false,
            isActive: true,
            role: ROLES.RESPONSABLE,
        },
        select: { id: true },
    });
    if (!user) {
        return { ok: false, error: 'Responsable introuvable, inactif ou sans le rôle Responsable.' };
    }
    return { ok: true, value: responsibleId };
}

/** Affecte l'utilisateur comme responsable du projet (rattachement projet sur fiche user). */
async function assignUserAsProjectResponsible(prisma, projectId, userId) {
    if (!projectId || !userId) return;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });
    if (!user || user.role !== ROLES.RESPONSABLE) return;

    await prisma.project.update({
        where: { id: projectId },
        data: { responsibleId: userId },
    });

    const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { projectId: true },
    });
    if (!existing?.projectId) {
        await prisma.user.update({
            where: { id: userId },
            data: { projectId },
        });
    }
}

/** Retire le responsable du projet si c'était cet utilisateur. */
async function clearProjectResponsibleIfUser(prisma, projectId, userId) {
    if (!projectId || !userId) return;
    await prisma.project.updateMany({
        where: { id: projectId, responsibleId: userId },
        data: { responsibleId: null },
    });
}

/**
 * Synchronise la messagerie projet quand un responsable est désigné.
 * Un même responsable peut porter plusieurs projets : on ne force pas user.projectId
 * s'il est déjà renseigné (rétrocompatibilité).
 */
async function syncResponsibleProjectMembership(prisma, projectId, responsibleId) {
    if (!projectId || !responsibleId) return;

    const user = await prisma.user.findUnique({
        where: { id: responsibleId },
        select: { id: true, role: true, projectId: true },
    });
    if (!user || user.role !== ROLES.RESPONSABLE) return;

    if (!user.projectId) {
        await prisma.user.update({
            where: { id: responsibleId },
            data: { projectId },
        });
    }

    try {
        const { syncProjectDiscussionMembers } = require('./projectDiscussion.service');
        await syncProjectDiscussionMembers(prisma, projectId);
    } catch (err) {
        logger.warn('PROJECT_RESPONSIBLE_DISCUSSION_SYNC', err.message, { projectId, responsibleId });
    }
}

async function getProjectForResponsible(prisma, userId) {
    if (!userId) return null;
    return prisma.project.findFirst({
        where: {
            isActive: true,
            status: 'ACTIVE',
            OR: [{ responsibleId: userId }, { users: { some: { id: userId } } }],
        },
        select: {
            id: true,
            name: true,
            code: true,
            responsibleId: true,
            consolidatorId: true,
            coordinatorId: true,
        },
    });
}

async function getOwnedResponsibleProjects(prisma, userId) {
    if (!userId) return [];
    return prisma.project.findMany({
        where: { responsibleId: userId, isActive: true, status: 'ACTIVE' },
        select: { id: true, name: true, code: true, responsibleId: true },
        orderBy: { name: 'asc' },
    });
}

/** Projets sur lesquels l'utilisateur peut agir (créer réunion/mission) : responsable OU coordinateur désigné. */
async function getOwnedOrCoordinatedProjects(prisma, userId) {
    if (!userId) return [];
    return prisma.project.findMany({
        where: {
            OR: [{ responsibleId: userId }, { coordinatorId: userId }],
            isActive: true,
            status: 'ACTIVE',
        },
        select: { id: true, name: true, code: true, responsibleId: true, coordinatorId: true },
        orderBy: { name: 'asc' },
    });
}

/** @deprecated Préférer getOwnedResponsibleProjects — renvoie le premier projet actif. */
async function getOwnedResponsibleProject(prisma, userId) {
    const list = await getOwnedResponsibleProjects(prisma, userId);
    return list[0] || null;
}

function isUserResponsibleOfProject(user, project) {
    if (!user?.id || !project) return false;
    return project.responsibleId === user.id;
}

async function validateActiveProjectId(prisma, projectId) {
    if (!projectId) return { ok: true, value: null };
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, isActive: true, status: true, responsibleId: true, coordinatorId: true },
    });
    if (!project) return { ok: false, error: 'Projet introuvable.' };
    if (!project.isActive || project.status !== 'ACTIVE') {
        return { ok: false, error: 'Ce projet est en pause ou terminé et ne peut pas être sélectionné.' };
    }
    return { ok: true, value: projectId, project };
}

/**
 * Vérifie qu'un utilisateur peut rattacher une action (mission, réunion, événement) à un projet.
 * Les responsables ne peuvent agir que sur un projet dont ils sont désignés responsables
 * OU coordinateur (le coordinateur bénéficie des mêmes droits de création que le responsable).
 */
async function validateProjectForUserAction(prisma, user, projectId, options = {}) {
    const { requiredForResponsable = true } = options;

    if (isPrivilegedAdmin(user?.role)) {
        return validateActiveProjectId(prisma, projectId);
    }

    if (isResponsable(user?.role) || isCoordinateur(user?.role)) {
        let pid = projectId;
        const owned = await getOwnedOrCoordinatedProjects(prisma, user.id);
        if (!pid) {
            if (!requiredForResponsable) {
                return { ok: true, value: null };
            }
            if (!owned.length) {
                return { ok: false, error: 'Aucun projet actif ne vous est assigné comme responsable ou coordinateur.' };
            }
            if (owned.length === 1) {
                pid = owned[0].id;
            } else {
                return {
                    ok: false,
                    error: 'Sélectionnez le projet concerné parmi vos projets.',
                };
            }
        }
        const check = await validateActiveProjectId(prisma, pid);
        if (!check.ok) return check;
        if (check.project.responsibleId !== user.id && check.project.coordinatorId !== user.id) {
            return {
                ok: false,
                error: 'Vous ne pouvez agir que sur un projet dont vous êtes responsable ou coordinateur.',
            };
        }
        return { ok: true, value: pid };
    }

    return validateActiveProjectId(prisma, projectId);
}

/** Filtre Prisma pour limiter les projets listés (taxonomy, sélecteurs). */
function projectsFilterWhereForUser(user) {
    if (isPrivilegedAdmin(user?.role)) return {};
    if (isResponsable(user?.role) || isCoordinateur(user?.role)) {
        return { OR: [{ responsibleId: user.id }, { coordinatorId: user.id }] };
    }
    return {};
}

const PROJECT_WITH_RESPONSIBLE_SELECT = {
    id: true,
    name: true,
    code: true,
    responsibleId: true,
    responsible: { select: RESPONSIBLE_USER_SELECT },
};

module.exports = {
    RESPONSIBLE_USER_SELECT,
    PROJECT_RESPONSIBLE_INCLUDE,
    PROJECT_WITH_RESPONSIBLE_SELECT,
    validateResponsibleId,
    assignUserAsProjectResponsible,
    clearProjectResponsibleIfUser,
    syncResponsibleProjectMembership,
    getProjectForResponsible,
    getOwnedResponsibleProjects,
    getOwnedOrCoordinatedProjects,
    getOwnedResponsibleProject,
    isUserResponsibleOfProject,
    validateActiveProjectId,
    validateProjectForUserAction,
    projectsFilterWhereForUser,
};
