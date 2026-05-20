const { ROLES, isPrivilegedAdmin } = require('../config/roles');
const { notificationService } = require('./notification.service');

const CONSOLIDATOR_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    isDeleted: true,
};

const PROJECT_CONSOLIDATOR_INCLUDE = {
    consolidator: { select: CONSOLIDATOR_USER_SELECT },
};

/** Charge le consolidateur actif d'un projet (null si non défini ou inactif). */
async function getProjectConsolidator(prisma, projectId) {
    if (!projectId) return null;
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            name: true,
            consolidatorId: true,
            consolidator: { select: CONSOLIDATOR_USER_SELECT },
        },
    });
    const c = project?.consolidator;
    if (!c || !c.isActive || c.isDeleted) return null;
    return c;
}

/** Fallback : tous les utilisateurs au rôle CONSOLIDATEUR (comportement historique). */
async function getLegacyRoleConsolidators(prisma) {
    return prisma.user.findMany({
        where: { role: ROLES.CONSOLIDATEUR, isActive: true, isDeleted: false },
        select: CONSOLIDATOR_USER_SELECT,
    });
}

/** Destinataires pour une validation liée à un projet. */
async function resolveConsolidatorRecipients(prisma, projectId) {
    const designated = await getProjectConsolidator(prisma, projectId);
    if (designated) return [designated];
    return getLegacyRoleConsolidators(prisma);
}

async function notifyConsolidatorsForProject(prisma, req, projectId, {
    type,
    emailType,
    emailArgs,
    title,
    message,
    link,
}) {
    const recipients = await resolveConsolidatorRecipients(prisma, projectId);
    for (const c of recipients) {
        const args = typeof emailArgs === 'function' ? emailArgs(c) : (emailArgs || [c]);
        await notificationService.sendFullNotification(
            prisma,
            c.id,
            c.email,
            type,
            emailType || type,
            args,
            title,
            message,
            link,
        );
    }
}

function isUserProjectConsolidator(user, projectOrConsolidatorId) {
    if (!user?.id) return false;
    const consolidatorId = typeof projectOrConsolidatorId === 'string'
        ? projectOrConsolidatorId
        : projectOrConsolidatorId?.consolidatorId;
    return Boolean(consolidatorId && consolidatorId === user.id);
}

function canActAsConsolidator(user, projectOrConsolidatorId) {
    if (!user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (user.role === ROLES.CONSOLIDATEUR) return true;
    return isUserProjectConsolidator(user, projectOrConsolidatorId);
}

async function canUserConsolidatePlanning(prisma, user, planning) {
    if (!user || !planning) return false;
    if (isPrivilegedAdmin(user.role) || user.role === ROLES.CONSOLIDATEUR) return true;
    const owner = planning.user || await prisma.user.findUnique({
        where: { id: planning.userId },
        select: { projectId: true },
    });
    if (!owner?.projectId) return false;
    const project = await prisma.project.findUnique({
        where: { id: owner.projectId },
        select: { consolidatorId: true },
    });
    return isUserProjectConsolidator(user, project);
}

/** Affecte l'utilisateur comme consolidateur du projet (ex. rattachement projet sur fiche user). */
async function assignUserAsProjectConsolidator(prisma, projectId, userId) {
    if (!projectId || !userId) return;
    await prisma.project.update({
        where: { id: projectId },
        data: { consolidatorId: userId },
    });
}

/** Retire le consolidateur du projet si c'était cet utilisateur (changement de projet). */
async function clearProjectConsolidatorIfUser(prisma, projectId, userId) {
    if (!projectId || !userId) return;
    await prisma.project.updateMany({
        where: { id: projectId, consolidatorId: userId },
        data: { consolidatorId: null },
    });
}

async function validateConsolidatorId(prisma, consolidatorId) {
    if (consolidatorId === undefined) return { ok: true };
    if (consolidatorId === null || consolidatorId === '') return { ok: true, value: null };
    const user = await prisma.user.findFirst({
        where: { id: consolidatorId, isDeleted: false, isActive: true },
        select: { id: true },
    });
    if (!user) return { ok: false, error: 'Consolidateur introuvable ou inactif.' };
    return { ok: true, value: consolidatorId };
}

module.exports = {
    CONSOLIDATOR_USER_SELECT,
    PROJECT_CONSOLIDATOR_INCLUDE,
    getProjectConsolidator,
    getLegacyRoleConsolidators,
    resolveConsolidatorRecipients,
    notifyConsolidatorsForProject,
    isUserProjectConsolidator,
    canActAsConsolidator,
    canUserConsolidatePlanning,
    validateConsolidatorId,
    assignUserAsProjectConsolidator,
    clearProjectConsolidatorIfUser,
};
