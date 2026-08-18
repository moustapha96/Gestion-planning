const crypto = require('crypto');
const { syncDirectionDiscussionMembers } = require('./directionDiscussion.service');
const { syncProjectDiscussionMembers } = require('./projectDiscussion.service');

const PUBLIC_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    isDeleted: true,
    avatarUrl: true,
    createdAt: true,
    directionId: true,
    projectId: true,
    phone: true,
    jobTitle: true,
    cellUnit: true,
    direction: { select: { id: true, name: true, code: true } },
    project: { select: { id: true, name: true, code: true } },
};

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function buildDeletedEmailAlias(email, userId) {
    const hash = crypto.createHash('sha256').update(`${userId}:${email || ''}:${Date.now()}`).digest('hex').slice(0, 16);
    return `deleted+${userId}+${hash}@deleted.local`;
}

function toPublicUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isDeleted: Boolean(user.isDeleted),
        avatarUrl: user.avatarUrl || null,
        createdAt: user.createdAt,
        directionId: user.directionId || null,
        projectId: user.projectId || null,
        phone: user.phone || null,
        jobTitle: user.jobTitle || null,
        cellUnit: user.cellUnit || null,
        direction: user.direction || null,
        project: user.project || null,
    };
}

async function findUserByEmail(prisma, email, { excludeId = null } = {}) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const user = await prisma.user.findFirst({
        where: {
            email: { equals: normalized, mode: 'insensitive' },
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: PUBLIC_USER_SELECT,
    });
    return user;
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

async function getHardDeleteBlockers(prisma, userId) {
    const [
        plannings,
        meetingsOrganized,
        missionsCreated,
        roomBookings,
        meetingFiles,
        missionFiles,
        projectFiles,
        meetingMessages,
    ] = await Promise.all([
        prisma.planning.count({ where: { userId } }),
        prisma.meeting.count({ where: { organizerId: userId } }),
        prisma.mission.count({ where: { createdById: userId } }),
        prisma.roomBooking.count({ where: { userId } }),
        prisma.meetingFile.count({ where: { uploadedById: userId } }),
        prisma.missionFile.count({ where: { uploadedById: userId } }),
        prisma.projectFile.count({ where: { uploadedById: userId } }),
        prisma.meetingMessage.count({ where: { senderId: userId } }),
    ]);

    const blockers = [];
    if (plannings) blockers.push(`${plannings} planning(s)`);
    if (meetingsOrganized) blockers.push(`${meetingsOrganized} réunion(s) organisée(s)`);
    if (missionsCreated) blockers.push(`${missionsCreated} mission(s) créée(s)`);
    if (roomBookings) blockers.push(`${roomBookings} réservation(s) de salle`);
    if (meetingFiles) blockers.push(`${meetingFiles} fichier(s) de réunion`);
    if (missionFiles) blockers.push(`${missionFiles} fichier(s) de mission`);
    if (projectFiles) blockers.push(`${projectFiles} fichier(s) de projet`);
    if (meetingMessages) blockers.push(`${meetingMessages} message(s) de réunion`);
    return blockers;
}

async function cleanupOptionalUserLinks(prisma, userId) {
    await prisma.$transaction([
        prisma.invitation.deleteMany({ where: { userId } }),
        prisma.missionAssignment.deleteMany({ where: { userId } }),
        prisma.refreshToken.deleteMany({ where: { userId } }),
        prisma.deviceToken.deleteMany({ where: { userId } }),
        prisma.notification.deleteMany({ where: { userId } }),
        prisma.passwordHistory.deleteMany({ where: { userId } }),
        prisma.directMessage.deleteMany({
            where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        }),
        prisma.directionDiscussionMember.deleteMany({ where: { userId } }),
        prisma.projectDiscussionMember.deleteMany({ where: { userId } }),
        prisma.directionMessage.deleteMany({ where: { senderId: userId } }),
        prisma.projectMessage.deleteMany({ where: { senderId: userId } }),
        prisma.auditLog.updateMany({ where: { userId }, data: { userId: null } }),
        prisma.backup.updateMany({ where: { createdById: userId }, data: { createdById: null } }),
        prisma.project.updateMany({ where: { createdById: userId }, data: { createdById: null } }),
        prisma.project.updateMany({ where: { responsibleId: userId }, data: { responsibleId: null } }),
        prisma.project.updateMany({ where: { consolidatorId: userId }, data: { consolidatorId: null } }),
        prisma.project.updateMany({ where: { coordinatorId: userId }, data: { coordinatorId: null } }),
        prisma.direction.updateMany({ where: { directorId: userId }, data: { directorId: null } }),
        prisma.user.update({ where: { id: userId }, data: { projectId: null, directionId: null } }),
    ]);
}

/**
 * Suppression applicative : libère l'e-mail pour recréation depuis le répertoire.
 */
async function purgeUserAccount(prisma, user) {
    if (!user?.id) {
        throw new Error('Utilisateur invalide');
    }

    const originalEmail = user.email;
    const deletedEmail = buildDeletedEmailAlias(originalEmail, user.id);
    await detachUserFromAllProjects(prisma, user.id);

    await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
    });

    try {
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
    } catch (err) {
        if (err?.code === 'P2002') {
            // Collision improbable sur l'alias : retry avec un suffixe unique
            const fallback = buildDeletedEmailAlias(`${originalEmail}:${Math.random()}`, user.id);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    isDeleted: true,
                    isActive: false,
                    email: fallback,
                    projectId: null,
                    avatarUrl: null,
                    twoFactorSecret: null,
                    twoFactorEnabled: false,
                },
            });
            return { deletedEmail: fallback, originalEmail };
        }
        throw err;
    }

    return { deletedEmail, originalEmail };
}

/**
 * Suppression définitive si aucun historique bloquant ; sinon purge (e-mail libéré).
 */
async function deleteUserCompletely(prisma, user) {
    if (!user?.id) throw new Error('Utilisateur invalide');

    await detachUserFromAllProjects(prisma, user.id);
    await cleanupOptionalUserLinks(prisma, user.id);

    const blockers = await getHardDeleteBlockers(prisma, user.id);
    if (blockers.length) {
        const purged = await purgeUserAccount(prisma, user);
        return {
            hardDeleted: false,
            emailReleased: true,
            originalEmail: purged.originalEmail,
            deletedEmail: purged.deletedEmail,
            reason: `Suppression définitive impossible (historique : ${blockers.join(', ')}). Compte anonymisé et e-mail libéré.`,
            blockers,
        };
    }

    await prisma.user.delete({ where: { id: user.id } });
    return {
        hardDeleted: true,
        emailReleased: true,
        originalEmail: user.email,
        blockers: [],
    };
}

function emailConflictPayload(existingUser, message) {
    return {
        error: message,
        code: 'EMAIL_ALREADY_USED',
        existingUser: toPublicUser(existingUser),
        canHardDelete: true,
        canReuseSoftDeleted: Boolean(existingUser?.isDeleted),
    };
}

module.exports = {
    PUBLIC_USER_SELECT,
    normalizeEmail,
    buildDeletedEmailAlias,
    toPublicUser,
    findUserByEmail,
    detachUserFromAllProjects,
    getHardDeleteBlockers,
    purgeUserAccount,
    deleteUserCompletely,
    emailConflictPayload,
};
