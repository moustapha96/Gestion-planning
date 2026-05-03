const { ROLES } = require('../config/roles');

/**
 * Purge les données métier en conservant:
 * - configuration (AppSetting)
 * - comptes ADMIN/SUPER_ADMIN
 * - directions
 * - répertoire (RepertoireContact)
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function purgeBusinessData(prisma) {
    const preservedAdmins = await prisma.user.findMany({
        where: {
            role: {
                in: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
            },
        },
        select: { id: true },
    });
    const preservedAdminIds = preservedAdmins.map((u) => u.id);

    const result = await prisma.$transaction(async (tx) => {
        const counts = {};

        // Supprime les données métier et leurs dépendances.
        counts.deviceTokens = (await tx.deviceToken.deleteMany({
            where: { userId: { notIn: preservedAdminIds } },
        })).count;
        counts.refreshTokens = (await tx.refreshToken.deleteMany({
            where: { userId: { notIn: preservedAdminIds } },
        })).count;
        counts.passwordHistory = (await tx.passwordHistory.deleteMany({
            where: { userId: { notIn: preservedAdminIds } },
        })).count;
        counts.notifications = (await tx.notification.deleteMany({
            where: { userId: { notIn: preservedAdminIds } },
        })).count;
        counts.auditLogs = (await tx.auditLog.deleteMany({
            where: {
                OR: [
                    { userId: null },
                    { userId: { notIn: preservedAdminIds } },
                ],
            },
        })).count;

        counts.projectFiles = (await tx.projectFile.deleteMany({})).count;
        counts.missionFiles = (await tx.missionFile.deleteMany({})).count;
        counts.missionAssignments = (await tx.missionAssignment.deleteMany({})).count;
        counts.meetingFiles = (await tx.meetingFile.deleteMany({})).count;
        counts.invitations = (await tx.invitation.deleteMany({})).count;
        counts.roomBookings = (await tx.roomBooking.deleteMany({})).count;
        counts.directionMessages = (await tx.directionMessage.deleteMany({})).count;
        counts.directMessages = (await tx.directMessage.deleteMany({})).count;
        counts.meetingMessages = (await tx.meetingMessage.deleteMany({})).count;

        counts.planningEvents = (await tx.planningEvent.deleteMany({})).count;
        counts.meetings = (await tx.meeting.deleteMany({})).count;
        counts.missions = (await tx.mission.deleteMany({})).count;
        counts.plannings = (await tx.planning.deleteMany({})).count;
        counts.projects = (await tx.project.deleteMany({})).count;
        counts.rooms = (await tx.room.deleteMany({})).count;

        counts.discussionMembers = (await tx.directionDiscussionMember.deleteMany({
            where: { userId: { notIn: preservedAdminIds } },
        })).count;

        counts.users = (await tx.user.deleteMany({
            where: {
                role: {
                    notIn: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
                },
            },
        })).count;

        return counts;
    });

    return {
        preservedAdmins: preservedAdminIds.length,
        ...result,
    };
}

module.exports = {
    purgeBusinessData,
};
