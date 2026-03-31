const { logger } = require('../utils/logger');

/**
 * Ferme automatiquement les réunions dont l'heure de fin est dépassée.
 * Statuts concernés: DRAFT | SENT | CONFIRMED -> COMPLETED
 */
async function autoCloseExpiredMeetings(prisma) {
    const now = new Date();
    const expired = await prisma.meeting.findMany({
        where: {
            status: { in: ['DRAFT', 'SENT', 'CONFIRMED'] },
            endTime: { lt: now },
        },
        select: { id: true },
        take: 1000,
    });
    if (!expired.length) return 0;

    const ids = expired.map((m) => m.id);
    await prisma.meeting.updateMany({
        where: { id: { in: ids } },
        data: { status: 'COMPLETED' },
    });
    await prisma.roomBooking.updateMany({
        where: { meetingId: { in: ids }, status: 'CONFIRMED' },
        data: { status: 'CANCELLED' },
    });

    logger.info('MEETING_AUTO_CLOSED', `${ids.length} réunion(s) fermée(s) automatiquement`, {
        count: ids.length,
    });
    return ids.length;
}

module.exports = {
    autoCloseExpiredMeetings,
};

