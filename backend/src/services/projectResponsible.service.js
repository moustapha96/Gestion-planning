const { ROLES, isPrivilegedAdmin, isResponsable } = require('../config/roles');
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

    await prisma.user.update({
        where: { id: userId },
        data: { projectId },
    });
}

/** Retire le responsable du projet si c'était cet utilisateur. */
async function clearProjectResponsibleIfUser(prisma, projectId, userId) {
    if (!projectId || !userId) return;
    await prisma.project.updateMany({
        where: { id: projectId, responsibleId: userId },
        data: { responsibleId: null },
    });
}

/** Synchronise projectId utilisateur quand le responsable est défini sur le projet. */
async function syncResponsibleProjectMembership(prisma, projectId, responsibleId) {
    if (!projectId) return;
    if (!responsibleId) return;

    const previous = await prisma.user.findFirst({
        where: { projectId, role: ROLES.RESPONSABLE, id: { not: responsibleId } },
        select: { id: true },
    });
    if (previous) {
        await prisma.user.update({
            where: { id: previous.id },
            data: { projectId: null },
        });
    }

    await prisma.user.update({
        where: { id: responsibleId },
        data: { projectId },
    });

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

async function getOwnedResponsibleProject(prisma, userId) {
    if (!userId) return null;
    return prisma.project.findFirst({
        where: { responsibleId: userId, isActive: true, status: 'ACTIVE' },
        select: { id: true, name: true, code: true, responsibleId: true },
    });
}

function isUserResponsibleOfProject(user, project) {
    if (!user?.id || !project) return false;
    return project.responsibleId === user.id;
}

async function validateActiveProjectId(prisma, projectId) {
    if (!projectId) return { ok: true, value: null };
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, isActive: true, status: true, responsibleId: true },
    });
    if (!project) return { ok: false, error: 'Projet introuvable.' };
    if (!project.isActive || project.status !== 'ACTIVE') {
        return { ok: false, error: 'Ce projet est en pause ou terminé et ne peut pas être sélectionné.' };
    }
    return { ok: true, value: projectId, project };
}

/**
 * Vérifie qu'un utilisateur peut rattacher une action (mission, réunion, événement) à un projet.
 * Les responsables ne peuvent agir que sur le projet dont ils sont désignés responsables.
 */
async function validateProjectForUserAction(prisma, user, projectId, options = {}) {
    const { requiredForResponsable = true } = options;

    if (isPrivilegedAdmin(user?.role)) {
        return validateActiveProjectId(prisma, projectId);
    }

    if (isResponsable(user?.role)) {
        let pid = projectId;
        if (!pid) {
            if (!requiredForResponsable) {
                return { ok: true, value: null };
            }
            const owned = await getOwnedResponsibleProject(prisma, user.id);
            if (!owned?.id) {
                return { ok: false, error: 'Aucun projet actif ne vous est assigné comme responsable.' };
            }
            pid = owned.id;
        }
        const check = await validateActiveProjectId(prisma, pid);
        if (!check.ok) return check;
        if (check.project.responsibleId !== user.id) {
            return {
                ok: false,
                error: 'Vous ne pouvez agir que sur le projet dont vous êtes responsable.',
            };
        }
        return { ok: true, value: pid };
    }

    return validateActiveProjectId(prisma, projectId);
}

/** Filtre Prisma pour limiter les projets listés (taxonomy, sélecteurs). */
function projectsFilterWhereForUser(user) {
    if (isPrivilegedAdmin(user?.role)) return {};
    if (isResponsable(user?.role)) return { responsibleId: user.id };
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
    getOwnedResponsibleProject,
    isUserResponsibleOfProject,
    validateActiveProjectId,
    validateProjectForUserAction,
    projectsFilterWhereForUser,
};
