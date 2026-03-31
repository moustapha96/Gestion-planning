/**
 * Cron job : rappels réunions J-1 à 8h00 — CDC §3.3.2
 * Envoie un email de rappel aux participants confirmés (ACCEPTED ou PENDING)
 * pour toutes les réunions du lendemain en statut SENT ou CONFIRMED.
 */
const { notificationService } = require('../services/notification.service');
const { logger } = require('../utils/logger');

async function runMeetingReminders(prisma) {
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    logger.info('CRON_REMINDERS_START', 'Démarrage envoi rappels réunions J-1', {
        window: `${tomorrowStart.toISOString()} → ${tomorrowEnd.toISOString()}`,
    });

    const meetings = await prisma.meeting.findMany({
        where: {
            startTime: { gte: tomorrowStart, lte: tomorrowEnd },
            status: { in: ['SENT', 'CONFIRMED'] },
        },
        include: {
            organizer: { select: { name: true, email: true } },
            room: { select: { name: true } },
            invitations: {
                where: { status: { in: ['PENDING', 'ACCEPTED'] } },
                include: { user: { select: { id: true, name: true, email: true } } },
            },
        },
    });

    let sent = 0;
    let failed = 0;

    for (const meeting of meetings) {
        for (const inv of meeting.invitations) {
            const participant = inv.user;
            try {
                await notificationService.sendEmailWithRetry(
                    participant.email,
                    'MEETING_REMINDER',
                    [participant, meeting],
                );
                sent++;
            } catch (err) {
                failed++;
                logger.warn('REMINDER_SEND_FAILED', err.message, {
                    meetingId: meeting.id,
                    userId: participant.id,
                });
            }
        }
    }

    logger.info('CRON_REMINDERS_DONE', `Rappels J-1 envoyés`, {
        meetingsCount: meetings.length,
        sent,
        failed,
    });
}

module.exports = { runMeetingReminders };
