const express = require('express');
const { logger } = require('../utils/logger');

/** Lundi 00:00:00 (semaine ISO / calendrier app) pour la date donnée */
function startOfWeekMonday(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const jsDay = date.getDay();
  const offset = jsDay === 0 ? -6 : 1 - jsDay;
  date.setDate(date.getDate() + offset);
  return date;
}

/**
 * Handler GET /api/calendar/month - Récupérer tous les événements du mois
 */
async function monthHandler(req, res) {
  try {
    if (!req.user || !req.prisma) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const planningsQuery = {
      weekStart: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (req.user && req.user.role === 'RESPONSABLE') {
      planningsQuery.userId = req.user.id;
    }

    const plannings = await req.prisma.planning.findMany({
      where: planningsQuery,
      include: {
        user: { select: { name: true, email: true } },
        events: {
          include: {
            room: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Tous les utilisateurs voient toutes les réunions sur le calendrier
    const meetings = await req.prisma.meeting.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        organizer: { select: { name: true, email: true } },
        room: true,
      },
    });

    const userId = req.user?.id;
    const missions = await req.prisma.mission.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
        OR: [
          { createdById: userId },
          { assignments: { some: { userId } } },
        ],
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    const events = [];

    plannings.forEach((planning) => {
      planning.events.forEach((event) => {
        events.push({
          id: event.id,
          type: 'planning-event',
          title: event.title,
          date: new Date(event.startTime).toISOString().split('T')[0],
          startTime: event.startTime,
          endTime: event.endTime,
          description: event.description,
          eventType: event.type,
          room: event.room?.name || event.destination || null,
          organizer: planning.user.name,
          status: planning.status,
          planningId: planning.id,
        });
      });
    });

    meetings.forEach((meeting) => {
      events.push({
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        date: new Date(meeting.startTime).toISOString().split('T')[0],
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        description: meeting.agenda,
        room: meeting.room?.name,
        organizer: meeting.organizer.name,
        status: meeting.status,
        meetingId: meeting.id,
      });
    });

    missions.forEach((mission) => {
      events.push({
        id: mission.id,
        type: 'mission',
        title: mission.title,
        date: new Date(mission.startTime).toISOString().split('T')[0],
        startTime: mission.startTime,
        endTime: mission.endTime,
        description: mission.description,
        location: mission.location,
        organizer: mission.createdBy.name,
        status: mission.status,
        missionId: mission.id,
      });
    });

    if (req.user && req.user.email) {
      logger.info('GET_CALENDAR_EVENTS', `User ${req.user.email} fetched calendar events`, {
        userId: req.user.id,
        month,
        year,
        eventCount: events.length,
      });
    }

    res.json({ events, month, year });
  } catch (error) {
    const userId = req.user ? req.user.id : null;
    logger.error('GET_CALENDAR_EVENTS_ERROR', error.message, { userId });
    res.status(500).json({ error: error.message || 'Erreur calendrier' });
  }
}

const router = express.Router({ mergeParams: false });

// GET /api/calendar - vérification que le routeur est monté
router.get('/', (req, res) => {
  res.json({ service: 'calendar', endpoints: ['month', 'week', 'day'] });
});

router.get('/month', monthHandler);

/**
 * GET /api/calendar/week - Récupérer les événements de la semaine
 */
router.get('/week', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const weekStart = startOfWeekMonday(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const plannings = await req.prisma.planning.findMany({
      where: {
        weekStart: {
          gte: weekStart,
          lte: weekEnd,
        },
        ...(req.user.role === 'RESPONSABLE' && { userId: req.user.id }),
      },
      include: {
        user: { select: { name: true, email: true } },
        events: {
          include: {
            room: { select: { id: true, name: true } },
          },
        },
      },
    });

    const meetings = await req.prisma.meeting.findMany({
      where: {
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        organizer: { select: { name: true, email: true } },
        room: true,
      },
    });

    const missions = await req.prisma.mission.findMany({
      where: {
        startTime: { gte: weekStart, lte: weekEnd },
        status: { not: 'CANCELLED' },
        OR: [
          { createdById: req.user.id },
          { assignments: { some: { userId: req.user.id } } },
        ],
      },
      include: { createdBy: { select: { name: true } } },
    });

    const events = [];

    plannings.forEach((planning) => {
      planning.events.forEach((event) => {
        events.push({
          id: event.id,
          type: 'planning-event',
          title: event.title,
          date: new Date(event.startTime).toISOString().split('T')[0],
          time: new Date(event.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          startTime: event.startTime,
          endTime: event.endTime,
          eventType: event.type,
          room: event.room?.name || event.destination || null,
        });
      });
    });

    meetings.forEach((meeting) => {
      events.push({
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        date: new Date(meeting.startTime).toISOString().split('T')[0],
        time: new Date(meeting.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        room: meeting.room?.name,
        meetingId: meeting.id,
        organizer: meeting.organizer?.name,
        status: meeting.status,
      });
    });

    missions.forEach((mission) => {
      events.push({
        id: mission.id,
        type: 'mission',
        title: mission.title,
        date: new Date(mission.startTime).toISOString().split('T')[0],
        time: new Date(mission.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        startTime: mission.startTime,
        endTime: mission.endTime,
        location: mission.location,
        missionId: mission.id,
        organizer: mission.createdBy?.name,
        status: mission.status,
      });
    });

    res.json({ events });
  } catch (error) {
    logger.error('GET_CALENDAR_WEEK_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendar/day - Récupérer les événements du jour
 */
router.get('/day', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const meetings = await req.prisma.meeting.findMany({
      where: {
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: 'CANCELLED' },
      },
      include: {
        organizer: { select: { name: true, email: true } },
        room: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const missions = await req.prisma.mission.findMany({
      where: {
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: 'CANCELLED' },
        OR: [
          { createdById: req.user.id },
          { assignments: { some: { userId: req.user.id } } },
        ],
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    });

    const planningEventWhere = {
      startTime: { gte: dayStart, lte: dayEnd },
      ...(req.user.role === 'RESPONSABLE' ? { planning: { userId: req.user.id } } : {}),
    };

    const planningEvents = await req.prisma.planningEvent.findMany({
      where: planningEventWhere,
      include: {
        planning: { select: { id: true, status: true, user: { select: { name: true } } } },
        room: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const events = [
      ...planningEvents.map((event) => ({
        id: event.id,
        type: 'planning-event',
        title: event.title,
        date: new Date(event.startTime).toISOString().split('T')[0],
        startTime: event.startTime,
        endTime: event.endTime,
        description: event.description,
        eventType: event.type,
        room: event.room?.name || event.destination || null,
        organizer: event.planning?.user?.name,
        status: event.planning?.status,
        planningId: event.planningId,
      })),
      ...meetings.map((meeting) => ({
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        date: new Date(meeting.startTime).toISOString().split('T')[0],
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        description: meeting.agenda,
        room: meeting.room?.name,
        meetingId: meeting.id,
        organizer: meeting.organizer.name,
        status: meeting.status,
      })),
      ...missions.map((mission) => ({
        id: mission.id,
        type: 'mission',
        title: mission.title,
        date: new Date(mission.startTime).toISOString().split('T')[0],
        startTime: mission.startTime,
        endTime: mission.endTime,
        description: mission.description,
        location: mission.location,
        missionId: mission.id,
        organizer: mission.createdBy.name,
        status: mission.status,
      })),
    ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.json({ events, date: date.toISOString().split('T')[0] });
  } catch (error) {
    logger.error('GET_CALENDAR_DAY_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.monthHandler = monthHandler;
module.exports.router = router;
