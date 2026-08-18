const express = require('express');
const jwt = require('jsonwebtoken');
const { notificationService } = require('../services/notification.service');
const { logger } = require('../utils/logger');
const {
    toAppYmd,
    appDayBounds,
    appDayBoundsFromYmd,
    eventOverlapsAppDay,
    timedEventOverlapsRange,
} = require('../utils/calendarEvents');
const { buildRoomDaySlots } = require('../utils/roomBooking');
const { calendarMeetingStatusFilter } = require('../config/meetingVisibility');
const { calendarMissionStatusFilter } = require('../config/missionVisibility');
const router = express.Router();

/** Lundi 00:00:00 du jour civil (fuseau applicatif) */
function startOfWeekMonday(d) {
    const { ymd } = appDayBounds(d);
    const anchor = appDayBoundsFromYmd(ymd).start;
    const jsDay = anchor.getUTCDay();
    const offset = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(anchor);
    monday.setUTCDate(anchor.getUTCDate() + offset);
    return appDayBoundsFromYmd(toAppYmd(monday)).start;
}

function mapRoomsForDay(rooms, meetings, dayYmd) {
    return (rooms || []).map((r) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        location: r.location || '',
        bookings: buildRoomDaySlots(r.id, dayYmd, r.bookings, meetings),
    }));
}

const PUBLIC_PLANNING_EVENT_INCLUDE = {
    room: { select: { id: true, name: true, location: true } },
    direction: { select: { id: true, name: true, code: true } },
    project: { select: { id: true, name: true, code: true } },
    eventType: { select: { id: true, name: true, code: true, color: true } },
    planning: {
        select: {
            id: true,
            status: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    jobTitle: true,
                    direction: { select: { name: true } },
                },
            },
        },
    },
};

/** Événements de planning validés (hors réunions/missions déjà affichées ailleurs). */
function publicPlanningEventsWhere(rangeStart, rangeEnd) {
    return {
        ...timedEventOverlapsRange(rangeStart, rangeEnd),
        planning: { status: 'VALIDATED' },
        NOT: {
            OR: [
                { type: 'REUNION' },
                { type: 'MISSION' },
                { eventType: { code: 'REUNION' } },
                { eventType: { code: 'MISSION' } },
            ],
        },
    };
}

// GET /api/public/day-planning - Planning de la journée pour toutes les salles (public)
router.get('/day-planning', async (req, res) => {
    try {
        if (!req.prisma) {
            return res.status(200).json({ rooms: [], date: new Date().toISOString() });
        }
        const { ymd: todayYmd, start: todayStart, end: todayEnd } = appDayBounds(new Date());

        const roomsRaw = await req.prisma.room.findMany({
            where: { status: 'ACTIVE' },
            include: {
                bookings: {
                    where: {
                        status: 'CONFIRMED',
                        date: {
                            gte: todayStart,
                            lte: todayEnd,
                        },
                    },
                    include: { meeting: { select: { id: true, title: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });

        const missions = await req.prisma.mission.findMany({
            where: {
                ...calendarMissionStatusFilter(),
                ...timedEventOverlapsRange(todayStart, todayEnd),
            },
            include: {
                createdBy: { select: { id: true, name: true, jobTitle: true } },
                assignments: {
                    include: {
                        user: { select: { id: true, name: true, jobTitle: true } },
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const meetings = await req.prisma.meeting.findMany({
            where: {
                ...calendarMeetingStatusFilter(),
                ...timedEventOverlapsRange(todayStart, todayEnd),
            },
            include: {
                organizer: { select: { id: true, name: true, jobTitle: true } },
                room: { select: { id: true, name: true, location: true } },
                eventType: { select: { id: true, name: true, code: true, color: true } },
                invitations: {
                    include: {
                        user: { select: { id: true, name: true, jobTitle: true } },
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const planningEvents = await req.prisma.planningEvent.findMany({
            where: publicPlanningEventsWhere(todayStart, todayEnd),
            include: PUBLIC_PLANNING_EVENT_INCLUDE,
            orderBy: { startTime: 'asc' },
        });

        const roomsWithBookings = mapRoomsForDay(roomsRaw, meetings, todayYmd);

        res.status(200).json({
            date: `${todayYmd}T12:00:00.000Z`,
            dateKey: todayYmd,
            rooms: roomsWithBookings,
            meetings: meetings || [],
            missions: missions || [],
            events: planningEvents || [],
        });
    } catch (error) {
        res.status(200).json({ rooms: [], date: new Date().toISOString() });
    }
});

// GET /api/public/week-planning - Lundi–dimanche : salles, réunions, missions (public)
router.get('/week-planning', async (req, res) => {
    try {
        if (!req.prisma) {
            return res.status(200).json({ weekStart: null, days: [] });
        }
        const anchor = req.query.date ? new Date(req.query.date) : new Date();
        const monday = startOfWeekMonday(anchor);
        const sundayYmd = toAppYmd(new Date(monday.getTime() + 6 * 86400000));
        const rangeEnd = appDayBoundsFromYmd(sundayYmd).end;

        const roomsRaw = await req.prisma.room.findMany({
            where: { status: 'ACTIVE' },
            include: {
                bookings: {
                    where: {
                        status: 'CONFIRMED',
                        date: { gte: monday, lte: rangeEnd },
                    },
                    include: { meeting: { select: { id: true, title: true } } },
                    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
                },
            },
            orderBy: { name: 'asc' },
        });

        const meetings = await req.prisma.meeting.findMany({
            where: {
                ...calendarMeetingStatusFilter(),
                ...timedEventOverlapsRange(monday, rangeEnd),
            },
            include: {
                organizer: { select: { id: true, name: true, jobTitle: true } },
                room: { select: { id: true, name: true, location: true } },
                eventType: { select: { id: true, name: true, code: true, color: true } },
                invitations: {
                    include: {
                        user: { select: { id: true, name: true, jobTitle: true } },
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const missions = await req.prisma.mission.findMany({
            where: {
                ...calendarMissionStatusFilter(),
                ...timedEventOverlapsRange(monday, rangeEnd),
            },
            include: {
                createdBy: { select: { id: true, name: true, jobTitle: true } },
                assignments: {
                    include: {
                        user: { select: { id: true, name: true, jobTitle: true } },
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const planningEvents = await req.prisma.planningEvent.findMany({
            where: publicPlanningEventsWhere(monday, rangeEnd),
            include: PUBLIC_PLANNING_EVENT_INCLUDE,
            orderBy: { startTime: 'asc' },
        });

        const days = [];
        for (let i = 0; i < 7; i += 1) {
            const d = new Date(monday.getTime() + i * 86400000);
            const dk = toAppYmd(d);

            const roomsForDay = mapRoomsForDay(roomsRaw, meetings, dk);
            const meetingsForDay = meetings.filter((m) => eventOverlapsAppDay(m.startTime, m.endTime, dk));
            const missionsForDay = missions.filter((m) => eventOverlapsAppDay(m.startTime, m.endTime, dk));
            const eventsForDay = planningEvents.filter((e) => eventOverlapsAppDay(e.startTime, e.endTime, dk));

            days.push({
                date: `${dk}T12:00:00.000Z`,
                dateKey: dk,
                rooms: roomsForDay,
                meetings: meetingsForDay,
                missions: missionsForDay,
                events: eventsForDay,
            });
        }

        res.status(200).json({
            weekStart: monday.toISOString(),
            weekEnd: rangeEnd.toISOString(),
            days,
        });
    } catch (error) {
        res.status(200).json({ weekStart: null, days: [] });
    }
});

const { fetchRepertoireContacts, buildRepertoireDocxBuffer, buildRepertoireSearchWhere } = require('../utils/repertoireDocxExport');

// GET /api/public/repertoire — annuaire (page d'accueil publique, lecture seule)
router.get('/repertoire', async (req, res) => {
    try {
        if (!req.prisma) {
            return res.status(200).json([]);
        }
        const search = String(req.query.search || '').trim();
        const contacts = await req.prisma.repertoireContact.findMany({
            where: buildRepertoireSearchWhere(search),
            orderBy: [{ directionLabel: 'asc' }, { ordre: 'asc' }, { numero: 'asc' }],
            select: {
                id: true,
                numero: true,
                prenomNom: true,
                fonction: true,
                poste: true,
                directe: true,
                portable: true,
                email: true,
                directionLabel: true,
            },
        });
        res.status(200).json(contacts);
    } catch (error) {
        logger.error('PUBLIC_REPERTOIRE', error.message);
        res.status(200).json([]);
    }
});

// GET /api/public/repertoire/export/docx — export Word (page d'accueil, sans authentification)
router.get('/repertoire/export/docx', async (req, res) => {
    try {
        if (!req.prisma) {
            return res.status(503).json({ error: 'Service indisponible' });
        }
        const search = String(req.query.search || '').trim();
        const contacts = await fetchRepertoireContacts(req.prisma, { search });
        const buffer = await buildRepertoireDocxBuffer(contacts);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="Repertoire_ADM_2026.docx"');
        res.send(buffer);
    } catch (error) {
        logger.error('PUBLIC_REPERTOIRE_EXPORT_DOCX', error.message);
        res.status(500).json({ error: 'Erreur génération DOCX' });
    }
});

// GET /api/public/meeting-invitations/respond?token=...
router.get('/meeting-invitations/respond', async (req, res) => {
    const render = (title, body) => `
      <html><head><meta charset="utf-8"><title>${title}</title></head>
      <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:24px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:24px;">
          <h2 style="margin-top:0;color:#1F5C8B;">${title}</h2>
          <p style="color:#333;">${body}</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/meetings" style="display:inline-block;background:#1F5C8B;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">Ouvrir les réunions</a></p>
        </div>
      </body></html>
    `;
    try {
        const token = String(req.query?.token || '');
        if (!token) {
            return res.status(400).send(render('Lien invalide', 'Le lien est invalide ou incomplet.'));
        }
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(400).send(render('Lien expiré', 'Ce lien de réponse a expiré ou est invalide.'));
        }
        if (payload?.purpose !== 'meeting_invitation_response') {
            return res.status(400).send(render('Lien invalide', 'Ce lien ne correspond pas à une réponse de convocation.'));
        }
        const status = payload.status === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
        const invitation = await req.prisma.invitation.findUnique({
            where: { id: payload.invitationId },
            include: { meeting: true, user: true },
        });
        if (!invitation) {
            return res.status(404).send(render('Invitation introuvable', 'Cette invitation n’existe plus.'));
        }
        if (invitation.meeting?.status === 'CANCELLED') {
            return res.status(400).send(render('Réunion annulée', 'Cette réunion a déjà été annulée.'));
        }
        if (invitation.status === status) {
            return res.send(render('Réponse déjà enregistrée', `Votre réponse est déjà "${status === 'ACCEPTED' ? 'Acceptée' : 'Refusée'}".`));
        }
        const updated = await req.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status, respondedAt: new Date() },
        });
        try {
            const responderName = invitation.user?.name || invitation.user?.email || 'Un participant';
            const responderEmail = invitation.user?.email ? ` (${invitation.user.email})` : '';
            const statusLabel = updated.status === 'ACCEPTED' ? 'accepté' : 'décliné';
            await notificationService.createNotification(
                req.prisma,
                invitation.meeting.organizerId,
                'MEETING_CONVOCATION',
                `Réponse de ${responderName}`,
                `${responderName}${responderEmail} a ${statusLabel} votre réunion "${invitation.meeting.title}"`,
                `/meetings/${invitation.meeting.id}`
            );
        } catch (e) {
            logger.error('PUBLIC_MEETING_RESPONSE_NOTIFY', e.message, { invitationId: invitation.id });
        }
        return res.send(render('Réponse enregistrée', `Merci, votre réponse "${status === 'ACCEPTED' ? 'Acceptée' : 'Refusée'}" a bien été prise en compte.`));
    } catch {
        return res.status(500).send(render('Erreur', 'Une erreur est survenue lors de la prise en compte de votre réponse.'));
    }
});

router.get('/director-approval', async (req, res) => {
    try {
        const { verifyApprovalToken } = require('../services/directorApproval.service');
        const payload = verifyApprovalToken(String(req.query.token || ''));
        res.json({
            entityType: payload.entityType,
            entityId: payload.entityId,
            action: payload.action,
        });
    } catch {
        res.status(400).json({ error: 'Lien de validation invalide ou expiré.' });
    }
});

router.post('/director-approval/approve', async (req, res) => {
    try {
        const { verifyApprovalToken, approveRequest } = require('../services/directorApproval.service');
        const payload = verifyApprovalToken(String(req.body?.token || req.query.token || ''));
        if (payload.action && payload.action !== 'approve') {
            return res.status(400).json({ error: 'Ce lien n\'est pas un lien de validation.' });
        }
        const updated = await approveRequest(req.prisma, {
            entityType: payload.entityType,
            entityId: payload.entityId,
            tokenPayload: payload,
        });
        res.json({ success: true, status: updated.status });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message || 'Lien invalide ou déjà utilisé.' });
    }
});

router.post('/director-approval/reject', async (req, res) => {
    try {
        const { verifyApprovalToken, rejectRequest } = require('../services/directorApproval.service');
        const payload = verifyApprovalToken(String(req.body?.token || req.query.token || ''));
        if (payload.action && payload.action !== 'reject') {
            return res.status(400).json({ error: 'Ce lien n\'est pas un lien de refus.' });
        }
        const updated = await rejectRequest(req.prisma, {
            entityType: payload.entityType,
            entityId: payload.entityId,
            tokenPayload: payload,
            reason: req.body?.reason || req.body?.rejectionReason,
        });
        res.json({ success: true, status: updated.status });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message || 'Lien invalide ou déjà utilisé.' });
    }
});

module.exports = router;

