const { ROLES } = require('../config/roles');

/**
 * Purge les données métier en conservant selon les options :
 *   - comptes ADMIN/SUPER_ADMIN (toujours préservés)
 *   - AppSetting / configuration (toujours préservée)
 *   - directions (toujours préservées)
 *   - salles / Room  (preserveRooms, défaut true)
 *   - répertoire / RepertoireContact (preserveRepertoire, défaut true)
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ preserveRooms?: boolean, preserveRepertoire?: boolean }} [opts]
 */
async function purgeBusinessData(prisma, opts = {}) {
    const { preserveRooms = true, preserveRepertoire = true } = opts;

    const preservedAdmins = await prisma.user.findMany({
        where: { role: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } },
        select: { id: true },
    });
    const preservedAdminIds = preservedAdmins.map((u) => u.id);

    const result = await prisma.$transaction(async (tx) => {
        const counts = {};

        // ── Tokens & historiques liés aux non-admins ──────────────────
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

        // ── Fichiers joints ───────────────────────────────────────────
        counts.projectFiles = (await tx.projectFile.deleteMany({})).count;
        counts.missionFiles = (await tx.missionFile.deleteMany({})).count;
        counts.missionAssignments = (await tx.missionAssignment.deleteMany({})).count;
        counts.meetingFiles = (await tx.meetingFile.deleteMany({})).count;
        counts.invitations = (await tx.invitation.deleteMany({})).count;

        // ── Messagerie ────────────────────────────────────────────────
        counts.directionMessages = (await tx.directionMessage.deleteMany({})).count;
        counts.projectDiscussionMembers = (await tx.projectDiscussionMember.deleteMany({})).count;
        counts.projectMessages = (await tx.projectMessage.deleteMany({})).count;
        counts.projectDiscussions = (await tx.projectDiscussion.deleteMany({})).count;
        counts.directMessages = (await tx.directMessage.deleteMany({})).count;
        counts.meetingMessages = (await tx.meetingMessage.deleteMany({})).count;

        // ── Réservations de salles (bookings, pas les salles elles-mêmes) ──
        counts.roomBookings = (await tx.roomBooking.deleteMany({})).count;

        // ── Données métier principales ────────────────────────────────
        counts.planningEvents = (await tx.planningEvent.deleteMany({})).count;
        counts.meetings = (await tx.meeting.deleteMany({})).count;
        counts.missions = (await tx.mission.deleteMany({})).count;
        counts.plannings = (await tx.planning.deleteMany({})).count;
        await tx.user.updateMany({ data: { projectId: null } });
        counts.projects = (await tx.project.deleteMany({})).count;

        // ── Salles — préservées si preserveRooms = true ───────────────
        if (!preserveRooms) {
            counts.rooms = (await tx.room.deleteMany({})).count;
        } else {
            counts.rooms = 0; // préservées
        }

        // ── Répertoire — préservé si preserveRepertoire = true ───────
        if (!preserveRepertoire) {
            counts.repertoireContacts = (await tx.repertoireContact.deleteMany({})).count;
        } else {
            counts.repertoireContacts = 0; // préservé
        }

        // ── Membres de discussions direction (non-admins) ─────────────
        counts.discussionMembers = (await tx.directionDiscussionMember.deleteMany({
            where: { userId: { notIn: preservedAdminIds } },
        })).count;

        // ── Utilisateurs non-admins ───────────────────────────────────
        counts.users = (await tx.user.deleteMany({
            where: { role: { notIn: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } },
        })).count;

        return counts;
    });

    return {
        preservedAdmins: preservedAdminIds.length,
        preservedRooms: preserveRooms,
        preservedRepertoire: preserveRepertoire,
        ...result,
    };
}

module.exports = { purgeBusinessData };
