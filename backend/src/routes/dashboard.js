const express = require('express');
const roleMiddleware = require('../middlewares/role.middleware');
const { ROLES, ADMIN_ROUTE_ROLES, isPrivilegedAdmin, isSuperAdmin } = require('../config/roles');

const router = express.Router();

// GET /api/dashboard/admin-stats — Statistiques globales enrichies (ADMIN uniquement) — CDC §3.7.3
router.get('/admin-stats', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        if (!req.prisma) {
            return res.status(200).json({ users: 0, activeUsers: 0, inactiveUsers: 0, usersByRole: {}, plannings: 0, planningsByStatus: {}, validationRate: 0, pendingPlannings: 0, missions: 0, activeMissions: 0, meetings: 0, meetingsThisMonth: 0, rooms: 0, roomOccupancy7d: 0 });
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [
            allUsers,
            planningsByStatus,
            missionsCount,
            activeMissionsCount,
            meetingsCount,
            meetingsThisMonth,
            roomsCount,
            roomsWithBookings,
            usersByRole,
        ] = await Promise.all([
            req.prisma.user.findMany({
                where: { isDeleted: false },
                select: { isActive: true, role: true },
            }),
            req.prisma.planning.groupBy({ by: ['status'], _count: { id: true } }),
            req.prisma.mission.count({ where: { status: { not: 'CANCELLED' } } }),
            req.prisma.mission.count({ where: { status: 'CONFIRMED', startTime: { lte: now }, endTime: { gte: now } } }),
            req.prisma.meeting.count({ where: { status: { not: 'CANCELLED' } } }),
            req.prisma.meeting.count({ where: { status: { not: 'CANCELLED' }, startTime: { gte: monthStart, lte: monthEnd } } }),
            req.prisma.room.count({ where: { status: 'ACTIVE' } }),
            // Réservations confirmées sur les 7 derniers jours
            req.prisma.roomBooking.findMany({
                where: { status: 'CONFIRMED', date: { gte: sevenDaysAgo, lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) } },
                select: { startTime: true, endTime: true },
            }),
            req.prisma.user.groupBy({ by: ['role'], _count: { id: true }, where: { isDeleted: false } }),
        ]);

        // Statistiques utilisateurs
        const activeUsers = allUsers.filter((u) => u.isActive).length;
        const inactiveUsers = allUsers.length - activeUsers;
        const roleStats = {};
        (usersByRole || []).forEach((x) => { roleStats[x.role] = x._count?.id ?? 0; });

        // Statistiques plannings
        const planningsTotal = (planningsByStatus || []).reduce((s, x) => s + (x._count?.id ?? 0), 0);
        const planningsMap = {};
        (planningsByStatus || []).forEach((x) => { planningsMap[x.status] = x._count?.id ?? 0; });
        const pendingPlannings = (planningsMap['SUBMITTED'] || 0)
            + (planningsMap['IN_CONSOLIDATION'] || 0)
            + (planningsMap['CP_PENDING'] || 0)
            + (planningsMap['SG_PENDING'] || 0)
            + (planningsMap['DG_PENDING'] || 0);
        // Taux de validation CDC §3.7.3: VALIDATED / (tout sauf DRAFT) * 100
        const nonDraftTotal = planningsTotal - (planningsMap['DRAFT'] || 0);
        const validationRate = nonDraftTotal > 0
            ? Math.round(((planningsMap['VALIDATED'] || 0) / nonDraftTotal) * 100)
            : 0;

        // Taux d'occupation salles 7 jours — CDC §3.7.3
        // Formule: somme durées réservations / (nb salles * 8h * 7j) * 100
        const totalSlotMinutes = roomsCount * 8 * 60 * 7; // 8h par jour * 7 jours
        let bookedMinutes = 0;
        (roomsWithBookings || []).forEach((b) => {
            const [sh, sm] = b.startTime.split(':').map(Number);
            const [eh, em] = b.endTime.split(':').map(Number);
            bookedMinutes += Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        });
        const roomOccupancy7d = totalSlotMinutes > 0
            ? Math.round((bookedMinutes / totalSlotMinutes) * 100)
            : 0;

        res.status(200).json({
            // Utilisateurs
            users: allUsers.length,
            activeUsers,
            inactiveUsers,
            usersByRole: roleStats,
            // Plannings
            plannings: planningsTotal,
            planningsByStatus: planningsMap,
            pendingPlannings,
            validationRate,
            // Missions
            missions: missionsCount,
            activeMissions: activeMissionsCount,
            // Réunions
            meetings: meetingsCount,
            meetingsThisMonth,
            // Salles
            rooms: roomsCount,
            roomOccupancy7d,
        });
    } catch (error) {
        console.error('Dashboard admin-stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

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

// GET /api/dashboard/today - Dashboard for today (salles occupées / libres)
router.get('/today', async (req, res) => {
    const emptyPayload = {
        freeRooms: 0,
        occupiedRooms: 0,
        meetingsToday: 0,
        pendingPlannings: 0,
        rooms: [],
    };
    try {
        if (!req.prisma) {
            return res.status(200).json(emptyPayload);
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
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        const meetingsToday = await req.prisma.meeting.count({
            where: {
                status: { not: 'CANCELLED' },
                startTime: { gte: todayStart, lte: todayEnd },
            },
        });

        const pendingPlannings = await req.prisma.planning.count({
            where: {
                status: { in: ['SUBMITTED', 'IN_CONSOLIDATION', 'CP_PENDING', 'SG_PENDING', 'DG_PENDING'] },
            },
        });

        const roomsWithStatus = (rooms || []).map((r) => {
            const bookingsList = (r.bookings || []).map((b) => ({
                id: b.id,
                startTime: b.startTime,
                endTime: b.endTime,
                meetingTitle: (b.meeting && b.meeting.title) || null,
                meetingId: b.meetingId,
            }));
            const occupied = bookingsList.length > 0;
            return {
                id: r.id,
                name: r.name,
                capacity: r.capacity,
                location: r.location || '',
                status: occupied ? 'OCCUPIED' : 'FREE',
                bookings: bookingsList,
                booking: bookingsList[0] || null,
            };
        });

        const occupiedRooms = roomsWithStatus.filter((r) => r.status === 'OCCUPIED').length;
        const freeRooms = roomsWithStatus.length - occupiedRooms;

        res.status(200).json({
            freeRooms,
            occupiedRooms,
            meetingsToday,
            pendingPlannings,
            rooms: roomsWithStatus,
        });
    } catch (error) {
        console.error('Dashboard today error:', error);
        res.status(200).json(emptyPayload);
    }
});

// GET /api/dashboard/week - Occupation sur la semaine
router.get('/week', async (req, res) => {
    const emptyPayload = {
        occupancyRate: '0',
        bookedSlots: 0,
        submittedPlannings: 0,
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        rooms: [],
    };
    try {
        if (!req.prisma) {
            return res.status(200).json(emptyPayload);
        }
        const now = new Date();
        const weekStart = startOfDay(new Date(now));
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
        const weekEnd = endOfDay(new Date(weekStart));
        weekEnd.setDate(weekStart.getDate() + 6);

        const rooms = await req.prisma.room.findMany({
            where: { status: 'ACTIVE' },
            include: {
                bookings: {
                    where: {
                        status: 'CONFIRMED',
                        date: { gte: weekStart, lte: weekEnd },
                    },
                },
            },
        });

        const totalSlots = (rooms && rooms.length) ? rooms.length * 7 * 11 : 0;
        const bookedCount = (rooms || []).reduce((sum, room) => sum + (room.bookings ? room.bookings.length : 0), 0);

        const [submittedPlannings, activeMissions] = await Promise.all([
            req.prisma.planning.count({
                where: {
                    status: 'VALIDATED',
                    weekStart: { gte: weekStart, lte: weekEnd },
                },
            }),
            // Missions actives chevauchant la semaine — CDC §3.7.2
            req.prisma.mission.count({
                where: {
                    status: 'CONFIRMED',
                    startTime: { lte: weekEnd },
                    endTime: { gte: weekStart },
                },
            }),
        ]);

        res.status(200).json({
            occupancyRate:
                totalSlots > 0 ? ((bookedCount / totalSlots) * 100).toFixed(1) : '0',
            bookedSlots: bookedCount,
            submittedPlannings,
            activeMissions,
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            rooms: (rooms || []).map((r) => ({
                id: r.id,
                name: r.name,
                bookingsCount: r.bookings ? r.bookings.length : 0,
            })),
        });
    } catch (error) {
        console.error('Dashboard week error:', error);
        res.status(200).json(emptyPayload);
    }
});

// GET /api/dashboard/search-global - recherche unifiée (réunions/missions/plannings/messages)
router.get('/search-global', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const typesRaw = String(req.query.types || 'meetings,missions,plannings,messages');
        const selectedTypes = new Set(typesRaw.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
        const from = req.query.from ? new Date(req.query.from) : null;
        const to = req.query.to ? new Date(req.query.to) : null;
        const isAdmin = isPrivilegedAdmin(req.user?.role);
        const isSuper = isSuperAdmin(req.user?.role);
        const userId = req.user?.id;
        if (!q) return res.json({ items: [], total: 0 });

        const contains = { contains: q, mode: 'insensitive' };
        const items = [];

        if (selectedTypes.has('meetings')) {
            const meetings = await req.prisma.meeting.findMany({
                where: {
                    ...(isAdmin ? {} : {
                        OR: [{ organizerId: userId }, { invitations: { some: { userId } } }],
                    }),
                    ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                    OR: [
                        { title: contains },
                        { agenda: contains },
                        { project: { name: contains } },
                        { project: { code: contains } },
                        { direction: { name: contains } },
                        { direction: { code: contains } },
                    ],
                },
                select: {
                    id: true,
                    title: true,
                    startTime: true,
                    status: true,
                    project: { select: { name: true, code: true } },
                    direction: { select: { name: true, code: true } },
                },
                orderBy: { startTime: 'desc' },
                take: limit,
            });
            meetings.forEach((m) => items.push({
                type: 'meeting',
                id: m.id,
                title: m.title,
                subtitle: `Réunion - ${m.status}${m.project?.name ? ` - Projet: ${m.project.name}` : ''}${m.direction?.name ? ` - Direction: ${m.direction.name}` : ''}`,
                date: m.startTime,
                link: `/meetings/${m.id}`,
            }));
        }

        if (selectedTypes.has('missions')) {
            const missions = await req.prisma.mission.findMany({
                where: {
                    ...(isAdmin ? {} : {
                        OR: [{ createdById: userId }, { assignments: { some: { userId } } }],
                    }),
                    ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                    OR: [
                        { title: contains },
                        { description: contains },
                        { location: contains },
                        { project: { name: contains } },
                        { project: { code: contains } },
                        { direction: { name: contains } },
                        { direction: { code: contains } },
                    ],
                },
                select: {
                    id: true,
                    title: true,
                    location: true,
                    startTime: true,
                    status: true,
                    project: { select: { name: true, code: true } },
                    direction: { select: { name: true, code: true } },
                },
                orderBy: { startTime: 'desc' },
                take: limit,
            });
            missions.forEach((m) => items.push({
                type: 'mission',
                id: m.id,
                title: m.title,
                subtitle: `Mission - ${m.location || m.status}${m.project?.name ? ` - Projet: ${m.project.name}` : ''}${m.direction?.name ? ` - Direction: ${m.direction.name}` : ''}`,
                date: m.startTime,
                link: `/missions/${m.id}`,
            }));
        }

        if (selectedTypes.has('plannings')) {
            const plannings = await req.prisma.planning.findMany({
                where: {
                    ...(isAdmin ? {} : { userId }),
                    ...(from || to ? { weekStart: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                },
                include: {
                    user: { select: { name: true } },
                    events: {
                        where: {
                            OR: [
                                { title: contains },
                                { description: contains },
                                { destination: contains },
                                { project: { name: contains } },
                                { project: { code: contains } },
                                { direction: { name: contains } },
                                { direction: { code: contains } },
                            ],
                        },
                        select: { id: true },
                    },
                },
                orderBy: { weekStart: 'desc' },
                take: limit,
            });
            plannings
                .filter((p) => (p.events || []).length > 0)
                .forEach((p) => items.push({
                    type: 'planning',
                    id: p.id,
                    title: `Planning ${p.user?.name || ''}`.trim(),
                    subtitle: `Planning - ${p.status}`,
                    date: p.weekStart,
                    link: `/planning/${p.id}`,
                }));
        }

        if (selectedTypes.has('messages')) {
            const [directMessages, meetingMessages] = await Promise.all([
                req.prisma.directMessage.findMany({
                    where: {
                        ...(isSuper
                            ? {}
                            : { OR: [{ senderId: userId }, { receiverId: userId }] }),
                        body: contains,
                        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                    },
                    select: { id: true, body: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                }),
                req.prisma.meetingMessage.findMany({
                    where: {
                        body: contains,
                        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                        meeting: isAdmin
                            ? {}
                            : { OR: [{ organizerId: userId }, { invitations: { some: { userId } } }] },
                    },
                    include: { meeting: { select: { id: true, title: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                }),
            ]);
            directMessages.forEach((m) => items.push({
                type: 'direct_message',
                id: m.id,
                title: (m.body || '').slice(0, 80) || 'Message privé',
                subtitle: 'Message direct',
                date: m.createdAt,
                link: '/discussions',
            }));
            meetingMessages.forEach((m) => items.push({
                type: 'meeting_message',
                id: m.id,
                title: (m.body || '').slice(0, 80) || 'Message réunion',
                subtitle: `Discussion réunion - ${m.meeting?.title || ''}`.trim(),
                date: m.createdAt,
                link: m.meeting?.id ? `/meetings/${m.meeting.id}` : '/meetings',
            }));
        }

        const sorted = items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, limit);
        res.json({ items: sorted, total: sorted.length });
    } catch (error) {
        console.error('Dashboard search-global error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dashboard/advanced - KPI avancés (ADMIN)
router.get('/advanced', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const now = new Date();
        const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = req.query.to ? new Date(req.query.to) : now;

        const [users, meetings, missions, invitationsAgg, assignmentsAgg, invitationsByUser, planningCount] = await Promise.all([
            req.prisma.user.findMany({
                where: { isDeleted: false, isActive: true },
                select: { id: true, name: true, email: true, role: true },
            }),
            req.prisma.meeting.count({ where: { status: { not: 'CANCELLED' }, startTime: { gte: from, lte: to } } }),
            req.prisma.mission.count({ where: { status: { not: 'CANCELLED' }, startTime: { gte: from, lte: to } } }),
            req.prisma.invitation.groupBy({
                by: ['status'],
                where: { meeting: { startTime: { gte: from, lte: to } } },
                _count: { _all: true },
            }),
            req.prisma.missionAssignment.groupBy({
                by: ['userId'],
                where: { mission: { startTime: { gte: from, lte: to }, status: { not: 'CANCELLED' } } },
                _count: { _all: true },
            }),
            req.prisma.invitation.groupBy({
                by: ['userId', 'status'],
                where: { meeting: { startTime: { gte: from, lte: to } } },
                _count: { _all: true },
            }),
            req.prisma.planning.count({ where: { weekStart: { gte: from, lte: to } } }),
        ]);

        const invMap = Object.fromEntries((invitationsAgg || []).map((x) => [x.status, x._count?._all || 0]));
        const accepted = invMap.ACCEPTED || 0;
        const declined = invMap.DECLINED || 0;
        const pending = invMap.PENDING || 0;
        const base = accepted + declined;
        const acceptanceRate = base > 0 ? Math.round((accepted / base) * 100) : 0;

        const assignmentMap = new Map((assignmentsAgg || []).map((x) => [x.userId, x._count?._all || 0]));
        const invUserMap = new Map();
        (invitationsByUser || []).forEach((x) => {
            const cur = invUserMap.get(x.userId) || { accepted: 0, declined: 0, pending: 0 };
            cur[String(x.status || '').toLowerCase()] = x._count?._all || 0;
            invUserMap.set(x.userId, cur);
        });

        const workloadByUser = (users || []).map((u) => {
            const inv = invUserMap.get(u.id) || { accepted: 0, pending: 0 };
            const missionsAssigned = assignmentMap.get(u.id) || 0;
            const meetingsAccepted = inv.accepted || 0;
            const meetingsPending = inv.pending || 0;
            return {
                userId: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                missionsAssigned,
                meetingsAccepted,
                meetingsPending,
                totalLoad: missionsAssigned + meetingsAccepted + meetingsPending,
            };
        }).sort((a, b) => b.totalLoad - a.totalLoad);

        res.json({
            period: { from, to },
            kpi: {
                meetings,
                missions,
                plannings: planningCount,
                acceptedInvitations: accepted,
                declinedInvitations: declined,
                pendingInvitations: pending,
                acceptanceRate,
            },
            workloadByUser,
        });
    } catch (error) {
        console.error('Dashboard advanced error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dashboard/advanced/export - export CSV (ADMIN)
router.get('/advanced/export', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const now = new Date();
        const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = req.query.to ? new Date(req.query.to) : now;
        const users = await req.prisma.user.findMany({
            where: { isDeleted: false, isActive: true },
            select: { id: true, name: true, email: true, role: true },
        });
        const assignmentsAgg = await req.prisma.missionAssignment.groupBy({
            by: ['userId'],
            where: { mission: { startTime: { gte: from, lte: to }, status: { not: 'CANCELLED' } } },
            _count: { _all: true },
        });
        const invitationsByUser = await req.prisma.invitation.groupBy({
            by: ['userId', 'status'],
            where: { meeting: { startTime: { gte: from, lte: to } } },
            _count: { _all: true },
        });

        const assignmentMap = new Map((assignmentsAgg || []).map((x) => [x.userId, x._count?._all || 0]));
        const invUserMap = new Map();
        (invitationsByUser || []).forEach((x) => {
            const cur = invUserMap.get(x.userId) || { accepted: 0, declined: 0, pending: 0 };
            cur[String(x.status || '').toLowerCase()] = x._count?._all || 0;
            invUserMap.set(x.userId, cur);
        });

        const rows = [
            ['Nom', 'Email', 'Role', 'MissionsAssignees', 'ReunionsAcceptees', 'ReunionsEnAttente', 'ChargeTotale'],
        ];
        (users || []).forEach((u) => {
            const inv = invUserMap.get(u.id) || { accepted: 0, pending: 0 };
            const missionsAssigned = assignmentMap.get(u.id) || 0;
            const meetingsAccepted = inv.accepted || 0;
            const meetingsPending = inv.pending || 0;
            const total = missionsAssigned + meetingsAccepted + meetingsPending;
            rows.push([u.name || '', u.email || '', u.role || '', missionsAssigned, meetingsAccepted, meetingsPending, total]);
        });

        const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
        const fileName = `dashboard-avance-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.status(200).send(csv);
    } catch (error) {
        console.error('Dashboard advanced export error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
