const { ROLES, isPrivilegedAdmin } = require('../config/roles');
const {
    LEGACY_PENDING_COORDINATOR_STATUSES,
    PENDING_CONSOLIDATOR_STATUSES,
} = require('../config/planningWorkflow');
const { formatPlanningWeekLabel, attachPlanningValidationProject } = require('./projectConsolidator.service');
const { canAutoFinalizeAfterConsolidation } = require('./planningValidation.service');
const {
    userCanSeeValidationMenu,
    canCoordinateDraftMeeting,
    canApproveDraftMeeting,
    canConsolidatePendingMeeting,
    canFinalizePendingMeeting,
    canCoordinateDraftMission,
    canApproveDraftMission,
    canConsolidatePendingMission,
    canFinalizePendingMission,
    canCoordinateSubmittedPlanning,
    canConsolidatePendingPlanning,
    canValidatePlanningAsCoordinator,
    isGlobalConsolidatorRole,
    meetingValidationAction,
    missionValidationAction,
    planningValidationActionLabel,
} = require('./validationPolicy.service');

const MEETING_INCLUDE = {
    organizer: { select: { id: true, name: true, email: true, role: true } },
    project: { select: { id: true, name: true, code: true, consolidatorId: true, coordinatorId: true } },
    room: { select: { id: true, name: true, location: true } },
    eventType: { select: { id: true, name: true, code: true, color: true } },
};

const MISSION_INCLUDE = {
    createdBy: { select: { id: true, name: true, email: true, role: true } },
    project: { select: { id: true, name: true, code: true, consolidatorId: true, coordinatorId: true } },
    direction: { select: { id: true, name: true, code: true } },
};

const PLANNING_INCLUDE = {
    user: {
        select: {
            id: true,
            name: true,
            email: true,
            projectId: true,
            project: { select: { id: true, name: true, code: true, consolidatorId: true, coordinatorId: true } },
        },
    },
    events: {
        include: {
            eventType: { select: { id: true, name: true, code: true, color: true } },
            room: { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'asc' },
    },
    _count: { select: { events: true } },
};

function buildMeetingCoordinatorDraftWhere(user) {
    const base = {
        status: 'DRAFT',
        organizer: { role: ROLES.RESPONSABLE },
    };
    if (isPrivilegedAdmin(user.role)) return base;
    return { ...base, project: { coordinatorId: user.id } };
}

function buildMeetingConsolidatorPendingWhere(user) {
    const base = {
        status: { in: PENDING_CONSOLIDATOR_STATUSES },
        organizer: { role: ROLES.RESPONSABLE },
    };
    if (isPrivilegedAdmin(user.role) || isGlobalConsolidatorRole(user)) return base;
    return { ...base, id: { in: [] } };
}

function buildMeetingLegacyCoordinatorWhere(user) {
    const base = {
        status: { in: LEGACY_PENDING_COORDINATOR_STATUSES },
        organizer: { role: ROLES.RESPONSABLE },
    };
    if (isPrivilegedAdmin(user.role)) return base;
    return { ...base, project: { coordinatorId: user.id } };
}

function buildMissionCoordinatorDraftWhere(user) {
    const base = { status: 'DRAFT', createdBy: { role: ROLES.RESPONSABLE } };
    if (isPrivilegedAdmin(user.role)) return base;
    return { ...base, project: { coordinatorId: user.id } };
}

function buildMissionConsolidatorPendingWhere(user) {
    const base = {
        status: { in: PENDING_CONSOLIDATOR_STATUSES },
        createdBy: { role: ROLES.RESPONSABLE },
    };
    if (isPrivilegedAdmin(user.role) || isGlobalConsolidatorRole(user)) return base;
    return { ...base, id: { in: [] } };
}

function buildMissionLegacyCoordinatorWhere(user) {
    const base = {
        status: { in: LEGACY_PENDING_COORDINATOR_STATUSES },
        createdBy: { role: ROLES.RESPONSABLE },
    };
    if (isPrivilegedAdmin(user.role)) return base;
    return { ...base, project: { coordinatorId: user.id } };
}

function buildPlanningsToCoordinateWhere(user) {
    const base = { status: 'SUBMITTED' };
    if (isPrivilegedAdmin(user.role)) return base;
    return {
        ...base,
        user: { project: { coordinatorId: user.id } },
    };
}

function buildPlanningsToConsolidateWhere(user) {
    const base = { status: { in: PENDING_CONSOLIDATOR_STATUSES } };
    if (isPrivilegedAdmin(user.role) || isGlobalConsolidatorRole(user)) return base;
    return { ...base, id: { in: [] } };
}

function buildPlanningsLegacyCoordinatorWhere(user) {
    const base = { status: { in: LEGACY_PENDING_COORDINATOR_STATUSES } };
    if (isPrivilegedAdmin(user.role)) return base;
    return {
        ...base,
        user: { project: { coordinatorId: user.id } },
    };
}

async function getUserDesignatedProjectIds(prisma, userId) {
    const [asConsolidator, asCoordinator] = await Promise.all([
        prisma.project.findMany({
            where: { consolidatorId: userId, isActive: true },
            select: { id: true },
        }),
        prisma.project.findMany({
            where: { coordinatorId: userId, isActive: true },
            select: { id: true },
        }),
    ]);
    return {
        consolidatorProjectIds: asConsolidator.map((p) => p.id),
        coordinatorProjectIds: asCoordinator.map((p) => p.id),
    };
}

function mapMeetingItem(meeting) {
    const action = meetingValidationAction(meeting) || 'approve';
    return {
        id: meeting.id,
        kind: 'meeting',
        title: meeting.title,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status,
        organizer: meeting.organizer,
        project: meeting.project,
        room: meeting.room,
        eventType: meeting.eventType,
        link: `/meetings/${meeting.id}`,
        action,
        validationPath: action === 'consolidate'
            ? 'consolidator'
            : action === 'coordinate'
              ? 'coordinator'
              : 'globalConsolidator',
    };
}

function mapPlanningItem(planning, action, missionsCount = 0, user = null) {
    const project = planning.user?.project || null;
    const autoFinalizeOnConsolidate = action === 'consolidate'
        && canAutoFinalizeAfterConsolidation(project, user);
    return {
        id: planning.id,
        kind: 'planning',
        action: autoFinalizeOnConsolidate ? 'consolidate_and_validate' : action,
        autoFinalizeOnConsolidate,
        validationPath: planningValidationActionLabel(planning),
        status: planning.status,
        weekStart: planning.weekStart,
        weekLabel: formatPlanningWeekLabel(planning.weekStart),
        owner: planning.user ? {
            id: planning.user.id,
            name: planning.user.name,
            email: planning.user.email,
        } : null,
        project: planning.user?.project || null,
        eventsCount: planning._count?.events ?? (planning.events?.length || 0),
        missionsCount,
        events: (planning.events || []).map((ev) => ({
            id: ev.id,
            title: ev.title,
            type: ev.type,
            startTime: ev.startTime,
            endTime: ev.endTime,
            eventType: ev.eventType,
            room: ev.room,
            planningId: planning.id,
            link: `/planning/${planning.id}`,
        })),
        link: `/planning/${planning.id}`,
    };
}

function mapMissionItem(mission) {
    const action = missionValidationAction(mission) || 'approve';
    return {
        id: mission.id,
        kind: 'mission',
        title: mission.title,
        location: mission.location,
        startTime: mission.startTime,
        endTime: mission.endTime,
        status: mission.status,
        createdBy: mission.createdBy,
        project: mission.project,
        direction: mission.direction,
        link: `/missions/${mission.id}`,
        action,
        validationPath: action === 'consolidate'
            ? 'consolidator'
            : action === 'coordinate'
                ? 'coordinator'
                : 'globalConsolidator',
    };
}

async function countWeekMissionsForPlanning(prisma, planning) {
    const weekStart = new Date(planning.weekStart);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return prisma.mission.count({
        where: {
            status: { not: 'CANCELLED' },
            OR: [
                { createdById: planning.userId },
                { assignments: { some: { userId: planning.userId } } },
            ],
            AND: [{ startTime: { lt: weekEnd } }, { endTime: { gt: weekStart } }],
        },
    });
}

async function fetchWeekMissionsForPlannings(prisma, plannings) {
    const missions = [];
    for (const planning of plannings) {
        const weekStart = new Date(planning.weekStart);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const rows = await prisma.mission.findMany({
            where: {
                status: { not: 'CANCELLED' },
                OR: [
                    { createdById: planning.userId },
                    { assignments: { some: { userId: planning.userId } } },
                ],
                AND: [{ startTime: { lt: weekEnd } }, { endTime: { gt: weekStart } }],
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                assignments: { include: { user: { select: { id: true, name: true } } } },
            },
            orderBy: { startTime: 'asc' },
        });
        for (const m of rows) {
            missions.push({
                id: m.id,
                kind: 'mission',
                title: m.title,
                location: m.location,
                startTime: m.startTime,
                endTime: m.endTime,
                createdBy: m.createdBy,
                assignments: m.assignments,
                planningId: planning.id,
                weekLabel: formatPlanningWeekLabel(planning.weekStart),
                ownerName: planning.user?.name,
                link: `/missions/${m.id}`,
                planningLink: `/planning/${planning.id}`,
            });
        }
    }
    return missions;
}

async function getPendingValidations(prisma, user) {
    const canSeeMenu = await userCanSeeValidationMenu(prisma, user);
    const emptyCounts = {
        total: 0,
        meetings: 0,
        planningsConsolidate: 0,
        planningsCoordinate: 0,
        missions: 0,
        events: 0,
    };

    if (!canSeeMenu) {
        return {
            canSeeMenu: false,
            hasAccess: false,
            counts: emptyCounts,
            meetings: [],
            planningsConsolidate: [],
            planningsCoordinate: [],
            missions: [],
            planningEvents: [],
        };
    }

    const [meetingCoordDraftRaw, meetingConsolidatorRaw, meetingLegacyRaw, missionCoordDraftRaw, missionConsolidatorRaw, missionLegacyRaw, planningCoordinateRaw, planningConsolidateRaw, planningLegacyRaw] = await Promise.all([
        prisma.meeting.findMany({
            where: buildMeetingCoordinatorDraftWhere(user),
            include: MEETING_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
        prisma.meeting.findMany({
            where: buildMeetingConsolidatorPendingWhere(user),
            include: MEETING_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
        prisma.meeting.findMany({
            where: buildMeetingLegacyCoordinatorWhere(user),
            include: MEETING_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
        prisma.mission.findMany({
            where: buildMissionCoordinatorDraftWhere(user),
            include: MISSION_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
        prisma.mission.findMany({
            where: buildMissionConsolidatorPendingWhere(user),
            include: MISSION_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
        prisma.mission.findMany({
            where: buildMissionLegacyCoordinatorWhere(user),
            include: MISSION_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
        prisma.planning.findMany({
            where: buildPlanningsToCoordinateWhere(user),
            include: PLANNING_INCLUDE,
            orderBy: { weekStart: 'desc' },
            take: 50,
        }),
        prisma.planning.findMany({
            where: buildPlanningsToConsolidateWhere(user),
            include: PLANNING_INCLUDE,
            orderBy: { weekStart: 'desc' },
            take: 50,
        }),
        prisma.planning.findMany({
            where: buildPlanningsLegacyCoordinatorWhere(user),
            include: PLANNING_INCLUDE,
            orderBy: { weekStart: 'desc' },
            take: 50,
        }),
    ]);

    const meetingIds = new Set();
    const meetings = [
        ...meetingCoordDraftRaw
            .filter((m) => {
                const ok = canCoordinateDraftMeeting(m, user) || canApproveDraftMeeting(m, user);
                if (ok) meetingIds.add(m.id);
                return ok;
            })
            .map(mapMeetingItem),
        ...meetingConsolidatorRaw
            .filter((m) => canConsolidatePendingMeeting(m, user) && !meetingIds.has(m.id))
            .map((m) => { meetingIds.add(m.id); return mapMeetingItem(m); }),
        ...meetingLegacyRaw
            .filter((m) => canFinalizePendingMeeting(m, user) && !meetingIds.has(m.id))
            .map(mapMeetingItem),
    ];

    const missionIds = new Set();
    const missions = [
        ...missionCoordDraftRaw
            .filter((m) => {
                const ok = canCoordinateDraftMission(m, user) || canApproveDraftMission(m, user);
                if (ok) missionIds.add(m.id);
                return ok;
            })
            .map(mapMissionItem),
        ...missionConsolidatorRaw
            .filter((m) => canConsolidatePendingMission(m, user) && !missionIds.has(m.id))
            .map((m) => { missionIds.add(m.id); return mapMissionItem(m); }),
        ...missionLegacyRaw
            .filter((m) => canFinalizePendingMission(m, user) && !missionIds.has(m.id))
            .map(mapMissionItem),
    ];

    const planningsConsolidate = planningConsolidateRaw
        .filter((p) => canConsolidatePendingPlanning(p, user))
        .map((p) => mapPlanningItem(p, 'consolidate', 0, user));
    const planningsCoordinate = [
        ...planningCoordinateRaw
            .filter((p) => canCoordinateSubmittedPlanning(p, user))
            .map((p) => mapPlanningItem(p, 'coordinate', 0, user)),
        ...planningLegacyRaw
            .filter((p) => canValidatePlanningAsCoordinator(p, user))
            .map((p) => mapPlanningItem(p, 'coordinate', 0, user)),
    ];
    const planningEvents = [];

    const counts = {
        meetings: meetings.length,
        planningsConsolidate: planningsConsolidate.length,
        planningsCoordinate: planningsCoordinate.length,
        missions: missions.length,
        events: 0,
        total: meetings.length + missions.length + planningsConsolidate.length + planningsCoordinate.length,
    };

    return {
        canSeeMenu: true,
        hasAccess: true,
        counts,
        meetings,
        planningsConsolidate,
        planningsCoordinate,
        missions,
        planningEvents,
    };
}

module.exports = {
    userCanSeeValidationMenu,
    getPendingValidations,
};
