const express = require('express');
const { logger } = require('../utils/logger');
const { APP_TIMEZONE } = require('../config/timezone');
const { meetingCalendarWhereForUser } = require('../config/meetingVisibility');
const { calendarMissionStatusFilter } = require('../config/missionVisibility');
const {
  toAppYmd,
  timedEventOverlapsRange,
  mapMissionToCalendarEvent,
  mapMeetingToCalendarEvent,
} = require('../utils/calendarEvents');
const {
  parseUtcDate,
  utcMonthBounds,
  utcNowParts,
  utcWeekBounds,
  utcDayBounds,
} = require('../utils/dateUtc');

/**
 * Handler GET /api/calendar/month - Récupérer tous les événements du mois
 */
async function monthHandler(req, res) {
  try {
    if (!req.user || !req.prisma) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    const nowParts = utcNowParts();
    const month = parseInt(req.query.month, 10) || nowParts.month;
    const year = parseInt(req.query.year, 10) || nowParts.year;

    const { start: startDate, end: endDate } = utcMonthBounds(year, month);

    const planningsQuery = {
      weekStart: {
        gte: startDate,
        lte: endDate,
      },
      status: 'VALIDATED',
    };

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

    // Réunions publiées ou visibles selon le rôle (brouillons responsable : organisateur + consolidateur)
    const meetings = await req.prisma.meeting.findMany({
      where: {
        ...timedEventOverlapsRange(startDate, endDate),
        ...meetingCalendarWhereForUser(req.user),
      },
      include: {
        organizer: { select: { name: true, email: true } },
        room: true,
      },
    });

    const missions = await req.prisma.mission.findMany({
      where: {
        ...timedEventOverlapsRange(startDate, endDate),
        ...calendarMissionStatusFilter(),
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
          date: toAppYmd(event.startTime),
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
      events.push(mapMeetingToCalendarEvent(meeting));
    });

    missions.forEach((mission) => {
      events.push(mapMissionToCalendarEvent(mission));
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
    const date = req.query.date ? parseUtcDate(req.query.date) : new Date();
    const { start: weekStart, end: weekEnd } = utcWeekBounds(date);

    const plannings = await req.prisma.planning.findMany({
      where: {
        weekStart: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: 'VALIDATED',
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
        ...timedEventOverlapsRange(weekStart, weekEnd),
        ...meetingCalendarWhereForUser(req.user),
      },
      include: {
        organizer: { select: { name: true, email: true } },
        room: true,
      },
    });

    const missions = await req.prisma.mission.findMany({
      where: {
        ...timedEventOverlapsRange(weekStart, weekEnd),
        ...calendarMissionStatusFilter(),
      },
      include: { createdBy: { select: { name: true } } },
    });

    const events = [];
    const timeFmt = { hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE };

    plannings.forEach((planning) => {
      planning.events.forEach((event) => {
        events.push({
          id: event.id,
          type: 'planning-event',
          title: event.title,
          date: toAppYmd(event.startTime),
          time: new Date(event.startTime).toLocaleTimeString('fr-FR', timeFmt),
          startTime: event.startTime,
          endTime: event.endTime,
          eventType: event.type,
          room: event.room?.name || event.destination || null,
        });
      });
    });

    meetings.forEach((meeting) => {
      events.push({
        ...mapMeetingToCalendarEvent(meeting),
        time: new Date(meeting.startTime).toLocaleTimeString('fr-FR', timeFmt),
      });
    });

    missions.forEach((mission) => {
      events.push({
        ...mapMissionToCalendarEvent(mission),
        time: new Date(mission.startTime).toLocaleTimeString('fr-FR', timeFmt),
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
    const date = req.query.date ? parseUtcDate(req.query.date) : new Date();
    const { start: dayStart, end: dayEnd } = utcDayBounds(date);

    const meetings = await req.prisma.meeting.findMany({
      where: {
        ...timedEventOverlapsRange(dayStart, dayEnd),
        ...meetingCalendarWhereForUser(req.user),
      },
      include: {
        organizer: { select: { name: true, email: true } },
        room: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const missions = await req.prisma.mission.findMany({
      where: {
        ...timedEventOverlapsRange(dayStart, dayEnd),
        ...calendarMissionStatusFilter(),
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    });

    // Calendrier partagé : tous les événements de planning validés sont
    // visibles par tous les utilisateurs de l'application.
    const planningEventWhere = {
      ...timedEventOverlapsRange(dayStart, dayEnd),
      planning: { status: 'VALIDATED' },
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
        date: toAppYmd(event.startTime),
        startTime: event.startTime,
        endTime: event.endTime,
        description: event.description,
        eventType: event.type,
        room: event.room?.name || event.destination || null,
        organizer: event.planning?.user?.name,
        status: event.planning?.status,
        planningId: event.planningId,
      })),
      ...meetings.map((m) => mapMeetingToCalendarEvent(m)),
      ...missions.map((m) => mapMissionToCalendarEvent(m)),
    ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.json({ events, date: toAppYmd(date) });
  } catch (error) {
    logger.error('GET_CALENDAR_DAY_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.monthHandler = monthHandler;
module.exports.router = router;
