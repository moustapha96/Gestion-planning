const { publishedMeetingStatusFilter } = require('../config/meetingVisibility');
const { getProjectForResponsible } = require('./projectResponsible.service');

function weekBounds(weekStart) {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
}

function overlapsWeek(startTime, endTime, weekStart, weekEnd) {
    const s = new Date(startTime);
    const e = new Date(endTime);
    return s < weekEnd && e > weekStart;
}

function mapMeetingToAggregatedEvent(meeting) {
    return {
        id: `meeting:${meeting.id}`,
        sourceType: 'MEETING',
        sourceId: meeting.id,
        title: meeting.title,
        type: 'REUNION',
        eventType: meeting.eventType || { code: 'REUNION', name: 'Réunion', color: '#1565C0' },
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        room: meeting.room,
        direction: meeting.direction,
        project: meeting.project,
        destination: meeting.room?.location || null,
        description: meeting.agenda,
        readOnly: true,
        link: `/meetings/${meeting.id}`,
    };
}

function mapMissionToAggregatedEvent(mission) {
    return {
        id: `mission:${mission.id}`,
        sourceType: 'MISSION',
        sourceId: mission.id,
        title: mission.title,
        type: 'MISSION',
        eventType: { code: 'MISSION', name: 'Mission', color: '#722ed1' },
        startTime: mission.startTime,
        endTime: mission.endTime,
        room: null,
        direction: mission.direction,
        project: mission.project,
        destination: mission.location,
        description: mission.description,
        readOnly: true,
        link: `/missions/${mission.id}`,
    };
}

function mapPlanningEventToAggregatedEvent(event) {
    return {
        id: `planning-event:${event.id}`,
        sourceType: 'PLANNING_EVENT',
        sourceId: event.id,
        title: event.title,
        type: event.type,
        eventType: event.eventType,
        startTime: event.startTime,
        endTime: event.endTime,
        room: event.room,
        direction: event.direction,
        project: event.project,
        destination: event.destination,
        description: event.description,
        readOnly: false,
        planningEventId: event.id,
    };
}

const MEETING_INCLUDE = {
    room: { select: { id: true, name: true, location: true } },
    direction: { select: { id: true, name: true, code: true } },
    project: { select: { id: true, name: true, code: true } },
    eventType: { select: { id: true, name: true, code: true, color: true } },
};

const MISSION_INCLUDE = {
    direction: { select: { id: true, name: true, code: true } },
    project: { select: { id: true, name: true, code: true } },
    createdBy: { select: { id: true, name: true } },
    assignments: { include: { user: { select: { id: true, name: true } } } },
};

async function resolvePlanningProject(prisma, planning) {
    const fromUser = planning.user?.project || null;
    if (fromUser?.id) return fromUser;
    return getProjectForResponsible(prisma, planning.userId);
}

async function fetchWeekMeetings(prisma, planning, project, weekStart, weekEnd) {
    const or = [{ organizerId: planning.userId }];
    if (project?.id) or.push({ projectId: project.id });

    return prisma.meeting.findMany({
        where: {
            ...publishedMeetingStatusFilter(),
            OR: or,
            startTime: { lt: weekEnd },
            endTime: { gt: weekStart },
        },
        include: MEETING_INCLUDE,
        orderBy: { startTime: 'asc' },
    });
}

async function fetchWeekMissions(prisma, planning, project, weekStart, weekEnd) {
    const or = [
        { createdById: planning.userId },
        { assignments: { some: { userId: planning.userId } } },
    ];
    if (project?.id) or.push({ projectId: project.id });

    return prisma.mission.findMany({
        where: {
            status: { not: 'CANCELLED' },
            OR: or,
            startTime: { lt: weekEnd },
            endTime: { gt: weekStart },
        },
        include: MISSION_INCLUDE,
        orderBy: { startTime: 'asc' },
    });
}

/**
 * Agrège missions publiées, réunions validées et événements manuels du planning.
 */
async function buildPlanningAggregation(prisma, planning, manualEvents = []) {
    const { start: weekStart, end: weekEnd } = weekBounds(planning.weekStart);
    const project = await resolvePlanningProject(prisma, planning);

    const [weekMeetings, weekMissions] = await Promise.all([
        fetchWeekMeetings(prisma, planning, project, weekStart, weekEnd),
        fetchWeekMissions(prisma, planning, project, weekStart, weekEnd),
    ]);

    const manualAggregated = (manualEvents || []).map(mapPlanningEventToAggregatedEvent);
    const aggregatedEvents = [
        ...weekMeetings.map(mapMeetingToAggregatedEvent),
        ...weekMissions.map(mapMissionToAggregatedEvent),
        ...manualAggregated,
    ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return {
        project,
        weekMeetings,
        weekMissions,
        aggregatedEvents,
        counts: {
            meetings: weekMeetings.length,
            missions: weekMissions.length,
            manualEvents: manualAggregated.length,
            total: aggregatedEvents.length,
        },
    };
}

async function enrichPlanningWithAggregation(prisma, planning) {
    const manualEvents = planning.events || [];
    const aggregation = await buildPlanningAggregation(prisma, planning, manualEvents);
    return {
        ...planning,
        ...aggregation,
        manualEvents,
        events: aggregation.aggregatedEvents,
        weekMissions: aggregation.weekMissions,
        weekMeetings: aggregation.weekMeetings,
        _count: {
            ...(planning._count || {}),
            events: aggregation.counts.total,
            manualEvents: aggregation.counts.manualEvents,
        },
    };
}

async function enrichPlanningsWithAggregation(prisma, plannings) {
    return Promise.all(plannings.map((p) => enrichPlanningWithAggregation(prisma, p)));
}

/** Crée ou récupère le planning hebdomadaire d'un responsable. */
async function ensurePlanningForResponsible(prisma, userId, weekStart) {
    const monday = new Date(weekStart);
    monday.setHours(0, 0, 0, 0);

    const existing = await prisma.planning.findUnique({
        where: { userId_weekStart: { userId, weekStart: monday } },
    });
    if (existing) return existing;

    return prisma.planning.create({
        data: {
            userId,
            weekStart: monday,
            status: 'VALIDATED',
            validatedAt: new Date(),
        },
    });
}

/** Assure un planning par responsable de projet actif pour la semaine. */
async function ensureWeekPlanningsForResponsibles(prisma, weekStart) {
    const monday = new Date(weekStart);
    monday.setHours(0, 0, 0, 0);

    const projects = await prisma.project.findMany({
        where: {
            isActive: true,
            status: 'ACTIVE',
            responsibleId: { not: null },
        },
        select: { responsibleId: true },
    });

    const responsibleIds = [...new Set(projects.map((p) => p.responsibleId).filter(Boolean))];
    await Promise.all(
        responsibleIds.map((userId) => ensurePlanningForResponsible(prisma, userId, monday)),
    );
}

module.exports = {
    weekBounds,
    buildPlanningAggregation,
    enrichPlanningWithAggregation,
    enrichPlanningsWithAggregation,
    ensurePlanningForResponsible,
    ensureWeekPlanningsForResponsibles,
    mapMeetingToAggregatedEvent,
    mapMissionToAggregatedEvent,
    mapPlanningEventToAggregatedEvent,
};
