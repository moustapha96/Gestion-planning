const express = require('express');
const roleMiddleware = require('../middlewares/role.middleware');
const { getAvailableRoomIds } = require('../utils/availability');
const { ADMIN_ROUTE_ROLES, isPrivilegedAdmin } = require('../config/roles');
const { appDayBounds, timedEventOverlapsRange, appDayBoundsFromYmd, toAppYmd } = require('../utils/calendarEvents');
const { parseUtcDate } = require('../utils/dateUtc');
const {
    buildRoomDaySlots,
    findCurrentBooking,
} = require('../utils/roomBooking');
const { calendarMeetingStatusFilter } = require('../config/meetingVisibility');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Gestion des salles de réunion
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Lister toutes les salles actives
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des salles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res) => {
    try {
        const includeAll = isPrivilegedAdmin(req.user?.role) && req.query.all === '1';
        const { ymd: todayYmd, start: todayStart, end: todayEnd } = appDayBounds(new Date());
        const now = new Date();

        const meetingsToday = await req.prisma.meeting.findMany({
            where: {
                ...calendarMeetingStatusFilter(),
                roomId: { not: null },
                ...timedEventOverlapsRange(todayStart, todayEnd),
            },
            select: {
                id: true, roomId: true, title: true, startTime: true, endTime: true,
            },
        });

        const rooms = await req.prisma.room.findMany({
            where: includeAll ? {} : { status: 'ACTIVE' },
            include: {
                bookings: {
                    where: {
                        status: 'CONFIRMED',
                        date: { gte: todayStart, lte: todayEnd },
                    },
                    include: { meeting: { select: { title: true } } },
                },
            },
            orderBy: { name: 'asc' },
        });

        const payload = rooms.map((room) => {
            const slots = buildRoomDaySlots(room.id, todayYmd, room.bookings, meetingsToday);
            const currentBooking = findCurrentBooking(slots, now, todayYmd);
            const occupied = !!currentBooking;
            return {
                ...room,
                bookings: undefined,
                todaySlots: slots,
                currentBooking: currentBooking || null,
                occupancyStatus: occupied ? 'BUSY' : 'FREE',
            };
        });

        res.json(payload);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET /api/rooms/status - Statut temps réel des salles
router.get('/status', async (req, res) => {
    try {
        const { ymd: todayYmd, start: todayStart, end: todayEnd } = appDayBounds(new Date());
        const now = new Date();

        const meetingsToday = await req.prisma.meeting.findMany({
            where: {
                ...calendarMeetingStatusFilter(),
                roomId: { not: null },
                ...timedEventOverlapsRange(todayStart, todayEnd),
            },
            select: {
                id: true, roomId: true, title: true, startTime: true, endTime: true,
            },
        });

        const rooms = await req.prisma.room.findMany({
            where: { status: 'ACTIVE' },
            include: {
                bookings: {
                    where: {
                        status: 'CONFIRMED',
                        date: { gte: todayStart, lte: todayEnd },
                    },
                    include: { meeting: { select: { title: true } } },
                },
            },
        });

        const status = rooms.map((room) => {
            const slots = buildRoomDaySlots(room.id, todayYmd, room.bookings, meetingsToday);
            const current = findCurrentBooking(slots, now, todayYmd);
            return {
                id: room.id,
                name: room.name,
                status: current ? 'OCCUPIED' : 'FREE',
                bookings: slots,
                currentBooking: current,
            };
        });

        res.json(status);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/rooms/available?startTime=ISO&endTime=ISO
 * Liste des salles libres pour le créneau donné (réunion = sur une salle libre, créneau libre)
 */
router.get('/available', async (req, res) => {
    try {
        const startTime = req.query.startTime ? parseUtcDate(req.query.startTime) : null;
        const endTime = req.query.endTime ? parseUtcDate(req.query.endTime) : null;
        if (!startTime || !endTime || startTime >= endTime) {
            return res.status(400).json({ error: 'startTime et endTime (ISO) requis, avec startTime < endTime' });
        }

        const excludeMeetingId = req.query.excludeMeetingId
            ? String(req.query.excludeMeetingId).trim()
            : null;
        const availableIds = await getAvailableRoomIds(
            req.prisma,
            startTime,
            endTime,
            excludeMeetingId || null,
        );
        const rooms = await req.prisma.room.findMany({
            where: { id: { in: availableIds }, status: 'ACTIVE' },
            orderBy: { name: 'asc' },
        });

        res.json(rooms);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/rooms/:id/bookings?date=YYYY-MM-DD
 * Créneaux déjà réservés pour une salle à une date (pour afficher "non disponible")
 */
router.get('/:id/bookings', async (req, res) => {
    try {
        const dateStr = req.query.date;
        if (!dateStr) {
            return res.status(400).json({ error: 'Paramètre date requis (YYYY-MM-DD)' });
        }
        const ymd = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : toAppYmd(parseUtcDate(dateStr));
        const { start: dayStart, end: dayEnd } = appDayBoundsFromYmd(ymd);

        const room = await req.prisma.room.findUnique({
            where: { id: req.params.id },
        });
        if (!room) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }
        if (room.status !== 'ACTIVE') {
            return res.status(410).json({ error: 'Salle désactivée : aucune opération possible sur cette salle' });
        }

        const bookings = await req.prisma.roomBooking.findMany({
            where: {
                roomId: req.params.id,
                status: 'CONFIRMED',
                date: { gte: dayStart, lte: dayEnd },
            },
            include: { meeting: { select: { id: true, title: true } } },
            orderBy: { createdAt: 'asc' },
        });

        const slots = bookings.map((b) => ({
            id: b.id,
            startTime: b.startTime,
            endTime: b.endTime,
            meetingTitle: b.meeting?.title || null,
            meetingId: b.meetingId,
        }));

        res.json({ roomId: req.params.id, date: dateStr, bookings: slots });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET /api/rooms/:id/slots - Get available slots
router.get('/:id/slots', async(req, res) => {
    try {
        const { date } = req.query;
        const targetDate = new Date(date);

        const room = await req.prisma.room.findUnique({
            where: { id: req.params.id },
            include: {
                bookings: {
                    where: { date: targetDate.toDateString() }
                }
            }
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        if (room.status !== 'ACTIVE') {
            return res.status(410).json({ error: 'Salle désactivée' });
        }

        // Parse room hours
        const [openHour] = room.openFrom.split(':');
        const [closeHour] = room.openTo.split(':');

        // Generate time slots
        const slots = [];
        for (let hour = parseInt(openHour); hour < parseInt(closeHour); hour++) {
            slots.push({
                startTime: `${hour.toString().padStart(2, '0')}:00`,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                available: !room.bookings.some(b =>
                    b.startTime === `${hour.toString().padStart(2, '0')}:00`
                )
            });
        }

        res.json(slots);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/rooms - Create room (admin only)
router.post('/', roleMiddleware(ADMIN_ROUTE_ROLES), async(req, res) => {
    try {
        const { name, capacity, location, equipment, openFrom, openTo } = req.body;

        const room = await req.prisma.room.create({
            data: {
                name,
                capacity,
                location,
                equipment: JSON.stringify(equipment || []),
                openFrom: openFrom || '08:00',
                openTo: openTo || '19:00',
                status: 'ACTIVE'
            }
        });

        res.json(room);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/rooms/:id - Update room
router.put('/:id', roleMiddleware(ADMIN_ROUTE_ROLES), async(req, res) => {
    try {
        const updated = await req.prisma.room.update({
            where: { id: req.params.id },
            data: {
                ...req.body,
                equipment: req.body.equipment ? JSON.stringify(req.body.equipment) : undefined
            }
        });

        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/rooms/:id - Deactivate room (aucune nouvelle réservation/réunion sur cette salle tant qu'elle est désactivée)
router.delete('/:id', roleMiddleware(ADMIN_ROUTE_ROLES), async(req, res) => {
    try {
        const updated = await req.prisma.room.update({
            where: { id: req.params.id },
            data: { status: 'DISABLED' }
        });

        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/rooms/:id/activate - Reactivate room (ADMIN)
router.put('/:id/activate', roleMiddleware(ADMIN_ROUTE_ROLES), async(req, res) => {
    try {
        const updated = await req.prisma.room.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE' }
        });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/rooms/:id/bookings - Book a room
router.post('/:id/bookings', async(req, res) => {
    try {
        const room = await req.prisma.room.findUnique({ where: { id: req.params.id } });
        if (!room) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }
        if (room.status !== 'ACTIVE') {
            return res.status(410).json({ error: 'Salle désactivée : aucune réservation possible' });
        }

        const { date, startTime, endTime } = req.body;

        // Check availability
        const conflict = await req.prisma.roomBooking.findFirst({
            where: {
                roomId: req.params.id,
                date: new Date(date),
                status: 'CONFIRMED'
            }
        });

        if (conflict) {
            return res.status(409).json({ error: 'Time slot not available' });
        }

        const booking = await req.prisma.roomBooking.create({
            data: {
                roomId: req.params.id,
                userId: req.user.id,
                date: new Date(date),
                startTime,
                endTime,
                status: 'CONFIRMED'
            }
        });

        res.json(booking);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/rooms/bookings/:id - Cancel booking
router.delete('/bookings/:id', async(req, res) => {
    try {
        const booking = await req.prisma.roomBooking.findUnique({
            where: { id: req.params.id }
        });

        if (booking.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updated = await req.prisma.roomBooking.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' }
        });

        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;