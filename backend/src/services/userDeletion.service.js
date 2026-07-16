const crypto = require('crypto');
const { syncDirectionDiscussionMembers } = require('./directionDiscussion.service');
const { syncProjectDiscussionMembers } = require('./projectDiscussion.service');

function buildDeletedEmailAlias(email, userId) {
    const hash = crypto.createHash('sha256').update(`${userId}:${email}`).digest('hex').slice(0, 16);
    return `deleted+${userId}+${hash}@deleted.local`;
}

/**
 * Retire un utilisateur de tous les rattachements projet (membre, responsable, consolidateur, coordinateur).
 */
async function detachUserFromAllProjects(prisma, userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { projectId: true, directionId: true },
    });

    const [asResponsible, asConsolidator, asCoordinator] = await Promise.all([
        prisma.project.findMany({ where: { responsibleId: userId }, select: { id: true } }),
        prisma.project.findMany({ where: { consolidatorId: userId }, select: { id: true } }),
        prisma.project.findMany({ where: { coordinatorId: userId }, select: { id: true } }),
    ]);

    const projectIds = new Set([
        user?.projectId,
        ...asResponsible.map((p) => p.id),
        ...asConsolidator.map((p) => p.id),
        ...asCoordinator.map((p) => p.id),
    ].filter(Boolean));

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { projectId: null },
        }),
        prisma.project.updateMany({
            where: { responsibleId: userId },
            data: { responsibleId: null },
        }),
        prisma.project.updateMany({
            where: { consolidatorId: userId },
            data: { consolidatorId: null },
        }),
        prisma.project.updateMany({
            where: { coordinatorId: userId },
            data: { coordinatorId: null },
        }),
    ]);

    if (user?.directionId) {
        await syncDirectionDiscussionMembers(prisma, user.directionId);
    }
    for (const projectId of projectIds) {
        await syncProjectDiscussionMembers(prisma, projectId);
    }
}

/**
 * Suppression applicative : libère l'e-mail pour recréation depuis le répertoire.
 */
async function purgeUserAccount(prisma, user) {
    if (!user?.id || !user?.email) {
        throw new Error('Utilisateur invalide');
    }

    const deletedEmail = buildDeletedEmailAlias(user.email, user.id);
    await detachUserFromAllProjects(prisma, user.id);

    await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
    });

    await prisma.user.update({
        where: { id: user.id },
        data: {
            isDeleted: true,
            isActive: false,
            email: deletedEmail,
            projectId: null,
            avatarUrl: null,
            twoFactorSecret: null,
            twoFactorEnabled: false,
        },
    });

    return { deletedEmail };
}

module.exports = {
    buildDeletedEmailAlias,
    detachUserFromAllProjects,
    purgeUserAccount,
};
