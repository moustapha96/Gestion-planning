const express = require('express');
const jwt = require('jsonwebtoken');
const { notificationService } = require('../services/notification.service');
const { logger } = require('../utils/logger');
const router = express.Router();

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

/** Lundi 00:00:00 local */
function startOfWeekMonday(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    const jsDay = date.getDay();
    const offset = jsDay === 0 ? -6 : 1 - jsDay;
    date.setDate(date.getDate() + offset);
    return date;
}

function ymdLocal(d) {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function mapRoomsWithBookings(rooms) {
    return (rooms || []).map((r) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        location: r.location || '',
        bookings: (r.bookings || []).map((b) => ({
            id: b.id,
            startTime: b.startTime,
            endTime: b.endTime,
            meetingTitle: (b.meeting && b.meeting.title) || null,
            meetingId: b.meetingId,
        })),
    }));
}

// GET /api/public/day-planning - Planning de la journée pour toutes les salles (public)
router.get('/day-planning', async (req, res) => {
    try {
        if (!req.prisma) {
            return res.status(200).json({ rooms: [], date: new Date().toISOString() });
        }
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const rooms = await req.prisma.room.findMany({
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

        const roomsWithBookings = mapRoomsWithBookings(rooms);

        const missions = await req.prisma.mission.findMany({
            where: {
                status: { not: 'CANCELLED' },
                startTime: { gte: todayStart, lte: todayEnd },
            },
            include: { createdBy: { select: { name: true } } },
            orderBy: { startTime: 'asc' },
        });

        const meetings = await req.prisma.meeting.findMany({
            where: {
                status: { not: 'CANCELLED' },
                startTime: { gte: todayStart, lte: todayEnd },
            },
            include: {
                organizer: { select: { name: true } },
                room: { select: { name: true, location: true } },
                eventType: { select: { id: true, name: true, code: true, color: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        res.status(200).json({
            date: todayStart.toISOString(),
            rooms: roomsWithBookings,
            meetings: meetings || [],
            missions: missions || [],
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
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const rangeEnd = endOfDay(sunday);

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
                status: { not: 'CANCELLED' },
                startTime: { gte: monday, lte: rangeEnd },
            },
            include: {
                organizer: { select: { name: true } },
                room: { select: { name: true, location: true } },
                eventType: { select: { id: true, name: true, code: true, color: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        const missions = await req.prisma.mission.findMany({
            where: {
                status: { not: 'CANCELLED' },
                startTime: { gte: monday, lte: rangeEnd },
            },
            include: { createdBy: { select: { name: true } } },
            orderBy: { startTime: 'asc' },
        });

        const roomsBase = mapRoomsWithBookings(roomsRaw);
        const days = [];
        for (let i = 0; i < 7; i += 1) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dk = ymdLocal(startOfDay(d));

            const roomsForDay = roomsBase.map((room) => ({
                ...room,
                bookings: room.bookings.filter((b) => ymdLocal(b.date) === dk),
            }));

            const meetingsForDay = meetings.filter((m) => ymdLocal(m.startTime) === dk);
            const missionsForDay = missions.filter((m) => ymdLocal(m.startTime) === dk);

            days.push({
                date: `${dk}T12:00:00.000Z`,
                dateKey: dk,
                rooms: roomsForDay,
                meetings: meetingsForDay,
                missions: missionsForDay,
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

// GET /api/public/repertoire — annuaire (page d'accueil publique, lecture seule)
router.get('/repertoire', async (req, res) => {
    try {
        if (!req.prisma) {
            return res.status(200).json([]);
        }
        const search = String(req.query.search || '').trim();
        const where = {};
        if (search) {
            where.OR = [
                { prenomNom: { contains: search, mode: 'insensitive' } },
                { fonction: { contains: search, mode: 'insensitive' } },
                { directionLabel: { contains: search, mode: 'insensitive' } },
                { portable: { contains: search, mode: 'insensitive' } },
                { poste: { contains: search, mode: 'insensitive' } },
                { directe: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const contacts = await req.prisma.repertoireContact.findMany({
            where,
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

module.exports = router;

