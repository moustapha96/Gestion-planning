const {
    ROLES, isPrivilegedAdmin, missionScopeWhere, planningScopeWhere, isResponsable,
} = require('../config/roles');
const { meetingListWhereForUser } = require('../config/meetingVisibility');
const { getPendingValidations } = require('./validationQueue.service');
const { getProjectForResponsible } = require('./projectResponsible.service');
const { userCanSeeValidationMenu } = require('./validationPolicy.service');
const { utcDayBounds, utcWeekBounds } = require('../utils/dateUtc');

function startOfDay(d) {
    return utcDayBounds(d).start;
}

function endOfDay(d) {
    return utcDayBounds(d).end;
}

function startOfWeekMonday(d) {
    return utcWeekBounds(d).start;
}

function overlapsRange(startTime, endTime, rangeStart, rangeEnd) {
    return new Date(startTime) < rangeEnd && new Date(endTime) > rangeStart;
}

async function countPendingValidations(prisma, user) {
    try {
        const data = await getPendingValidations(prisma, user);
        return data?.counts?.total ?? 0;
    } catch {
        return 0;
    }
}

async function resolveUserProjectIds(prisma, user) {
    const ids = new Set();
    if (user?.projectId) ids.add(user.projectId);
    const project = await getProjectForResponsible(prisma, user?.id);
    if (project?.id) ids.add(project.id);
    if (isPrivilegedAdmin(user?.role)) {
        const all = await prisma.project.findMany({
            where: { isActive: true, status: 'ACTIVE' },
            select: { id: true },
        });
        all.forEach((p) => ids.add(p.id));
    } else {
        const designated = await prisma.project.findMany({
            where: {
                isActive: true,
                OR: [{ consolidatorId: user.id }, { coordinatorId: user.id }, { responsibleId: user.id }],
            },
            select: { id: true },
        });
        designated.forEach((p) => ids.add(p.id));
    }
    return [...ids];
}

/**
 * Statistiques du jour pour l'utilisateur connecté.
 */
async function buildUserTodayStats(prisma, user) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const meetingWhere = meetingListWhereForUser(user);
    const missionWhere = missionScopeWhere(user);

    const [
        meetingsToday,
        missionsToday,
        pendingInvitations,
        pendingValidations,
        meetingsTodayList,
    ] = await Promise.all([
        prisma.meeting.count({
            where: {
                AND: [
                    meetingWhere,
                    { status: { not: 'CANCELLED' } },
                    { startTime: { lte: todayEnd } },
                    { endTime: { gte: todayStart } },
                ],
            },
        }),
        prisma.mission.count({
            where: {
                ...missionWhere,
                status: { not: 'CANCELLED' },
                startTime: { lte: todayEnd },
                endTime: { gte: todayStart },
            },
        }),
        prisma.invitation.count({
            where: {
                userId: user.id,
                status: 'PENDING',
                meeting: {
                    status: { not: 'CANCELLED' },
                    startTime: { gte: todayStart },
                },
            },
        }),
        countPendingValidations(prisma, user),
        prisma.meeting.findMany({
            where: {
                AND: [
                    meetingWhere,
                    { status: { not: 'CANCELLED' } },
                    { startTime: { lte: todayEnd } },
                    { endTime: { gte: todayStart } },
                ],
            },
            include: {
                room: { select: { id: true, name: true, location: true, capacity: true } },
                project: { select: { id: true, name: true, code: true } },
            },
            orderBy: { startTime: 'asc' },
            take: 50,
        }),
    ]);

    const canValidate = await userCanSeeValidationMenu(prisma, user);

    const myMeetingsToday = (meetingsTodayList || []).map((m) => ({
        id: m.id,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        status: m.status,
        room: m.room ? {
            id: m.room.id,
            name: m.room.name,
            location: m.room.location,
            capacity: m.room.capacity,
        } : null,
        project: m.project,
        link: `/meetings/${m.id}`,
    }));

    return {
        scope: 'user',
        meetingsToday,
        missionsToday,
        activitiesToday: meetingsToday + missionsToday,
        pendingInvitations,
        pendingValidations,
        canValidate,
        myMeetingsToday,
        // Compatibilité ancienne API (cartes frontend)
        freeRooms: 0,
        occupiedRooms: 0,
        pendingPlannings: pendingValidations,
        rooms: [],
    };
}

/**
 * Statistiques de la semaine pour l'utilisateur connecté.
 */
async function buildUserWeekStats(prisma, user) {
    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const weekEnd = endOfDay(new Date(weekStart));
    weekEnd.setDate(weekStart.getDate() + 6);

    const meetingWhere = meetingListWhereForUser(user);
    const missionWhere = missionScopeWhere(user);
    const planningWhere = planningScopeWhere(user);

    const [
        meetingsThisWeek,
        missionsThisWeek,
        planningsThisWeek,
        manualPlanningEvents,
        pendingValidations,
        projectIds,
    ] = await Promise.all([
        prisma.meeting.count({
            where: {
                AND: [
                    meetingWhere,
                    { status: { not: 'CANCELLED' } },
                    { startTime: { lt: weekEnd } },
                    { endTime: { gt: weekStart } },
                ],
            },
        }),
        prisma.mission.count({
            where: {
                ...missionWhere,
                status: { not: 'CANCELLED' },
                startTime: { lt: weekEnd },
                endTime: { gt: weekStart },
            },
        }),
        prisma.planning.count({
            where: {
                ...planningWhere,
                weekStart: { gte: weekStart, lte: weekEnd },
                status: { not: 'CANCELLED' },
            },
        }),
        prisma.planningEvent.count({
            where: {
                planning: {
                    ...planningWhere,
                    weekStart: { gte: weekStart, lte: weekEnd },
                    status: { not: 'CANCELLED' },
                },
                startTime: { lt: weekEnd },
                endTime: { gt: weekStart },
            },
        }),
        countPendingValidations(prisma, user),
        resolveUserProjectIds(prisma, user),
    ]);

    const canValidate = await userCanSeeValidationMenu(prisma, user);

    const activitiesThisWeek = meetingsThisWeek + missionsThisWeek + manualPlanningEvents;

    return {
        scope: 'user',
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        meetingsThisWeek,
        missionsThisWeek,
        planningsThisWeek,
        manualPlanningEvents,
        activitiesThisWeek,
        pendingValidations,
        canValidate,
        projectCount: projectIds.length,
        // Compatibilité ancienne API
        occupancyRate: activitiesThisWeek > 0 ? '100' : '0',
        bookedSlots: activitiesThisWeek,
        submittedPlannings: planningsThisWeek,
        activeMissions: missionsThisWeek,
        rooms: [],
    };
}

module.exports = {
    buildUserTodayStats,
    buildUserWeekStats,
};
