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

        const roomsWithBookings = (rooms || []).map((r) => ({
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

