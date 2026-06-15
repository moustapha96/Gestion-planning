const { ROLES, isPrivilegedAdmin } = require('../config/roles');
const { PENDING_COORDINATOR_STATUSES } = require('../config/planningWorkflow');
const { formatPlanningWeekLabel, attachPlanningValidationProject } = require('./projectConsolidator.service');
const { canAutoFinalizeAfterConsolidation } = require('./planningValidation.service');
const {
    userCanSeeValidationMenu,
    canConsolidateDraftMeeting,
    canApproveDraftMeeting,
    canFinalizePendingMeeting,
    canConsolidateSubmittedPlanning,
    canValidatePlanningAsCoordinator,
    isGlobalConsolidatorRole,
    meetingValidationAction,
    planningValidationActionLabel,
} = require('./validationPolicy.service');

const MEETING_INCLUDE = {
    organizer: { select: { id: true, name: true, email: true, role: true } },
    project: { select: { id: true, name: true, code: true, consolidatorId: true, coordinatorId: true } },
    room: { select: { id: true, name: true, location: true } },
    eventType: { select: { id: true, name: true, code: true, color: true } },
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

function buildMeetingDraftWhere(user) {
    const base = {
        status: 'DRAFT',
        organizer: { role: ROLES.RESPONSABLE },
    };
    if (isPrivilegedAdmin(user.role)) return base;
    return {
        ...base,
        OR: [
            { project: { consolidatorId: user.id } },
            { project: { consolidatorId: null, coordinatorId: user.id } },
            ...(isGlobalConsolidatorRole(user)
                ? [{ project: { consolidatorId: null, coordinatorId: null } }, { projectId: null }]
                : []),
        ],
    };
}

function buildMeetingFinalizeWhere(user) {
    const base = {
        status: { in: require('../config/planningWorkflow').PENDING_COORDINATOR_STATUSES },
        organizer: { role: ROLES.RESPONSABLE },
    };
    if (isPrivilegedAdmin(user.role)) return base;
    const or = [{ project: { coordinatorId: user.id } }];
    if (isGlobalConsolidatorRole(user)) {
        or.push({ project: { coordinatorId: null } });
        or.push({ projectId: null });
    }
    return { ...base, OR: or };
}

function buildPlanningsToConsolidateWhere(user, consolidatorProjectIds = []) {
    const base = { status: 'SUBMITTED' };
    if (isPrivilegedAdmin(user.role)) {
        return {
            ...base,
            OR: [
                { user: { project: { consolidatorId: { not: null } } } },
                ...(consolidatorProjectIds.length
                    ? [
                        { user: { projectId: { in: consolidatorProjectIds } } },
                        { events: { some: { projectId: { in: consolidatorProjectIds } } } },
                        { userId: user.id },
                    ]
                    : []),
            ],
        };
    }

    const or = [
        { user: { project: { consolidatorId: user.id } } },
        { events: { some: { project: { consolidatorId: user.id } } } },
    ];
    if (consolidatorProjectIds.length) {
        or.push(
            { user: { projectId: { in: consolidatorProjectIds } } },
            { events: { some: { projectId: { in: consolidatorProjectIds } } } },
            { userId: user.id },
        );
    }
    return { ...base, OR: or };
}

function buildPlanningsToCoordinateWhere(user, coordinatorProjectIds = []) {
    const coordinatorPending = { status: { in: PENDING_COORDINATOR_STATUSES } };
    const submittedSkipConsolidator = {
        status: 'SUBMITTED',
        user: { project: { consolidatorId: null, coordinatorId: { not: null } } },
    };

    if (isPrivilegedAdmin(user.role)) {
        return {
            OR: [
                coordinatorPending,
                submittedSkipConsolidator,
                {
                    status: 'SUBMITTED',
                    user: { project: { consolidatorId: null, coordinatorId: null } },
                },
            ],
        };
    }

    const or = [
        { ...coordinatorPending, user: { project: { coordinatorId: user.id } } },
        { ...submittedSkipConsolidator, user: { project: { coordinatorId: user.id } } },
        { ...coordinatorPending, events: { some: { project: { coordinatorId: user.id } } } },
        {
            ...submittedSkipConsolidator,
            events: { some: { project: { consolidatorId: null, coordinatorId: user.id } } },
        },
    ];
    if (coordinatorProjectIds.length) {
        or.push(
            { ...coordinatorPending, user: { projectId: { in: coordinatorProjectIds } } },
            { ...coordinatorPending, events: { some: { projectId: { in: coordinatorProjectIds } } } },
            {
                ...submittedSkipConsolidator,
                user: { projectId: { in: coordinatorProjectIds } },
            },
            {
                ...submittedSkipConsolidator,
                events: { some: { projectId: { in: coordinatorProjectIds } } },
            },
            { ...coordinatorPending, userId: user.id },
            { ...submittedSkipConsolidator, userId: user.id },
        );
    }
    if (isGlobalConsolidatorRole(user)) {
        or.push({
            status: 'SUBMITTED',
            user: { project: { consolidatorId: null, coordinatorId: null } },
        });
        or.push({
            ...coordinatorPending,
            user: { project: { consolidatorId: null, coordinatorId: null } },
        });
    }
    return { OR: or };
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

    const [meetingDraftRaw, meetingFinalizeRaw] = await Promise.all([
        prisma.meeting.findMany({
            where: buildMeetingDraftWhere(user),
            include: MEETING_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
        prisma.meeting.findMany({
            where: buildMeetingFinalizeWhere(user),
            include: MEETING_INCLUDE,
            orderBy: { startTime: 'asc' },
            take: 100,
        }),
    ]);

    const meetingDraftIds = new Set();
    const meetings = [
        ...meetingDraftRaw
            .filter((m) => {
                const ok = canConsolidateDraftMeeting(m, user) || canApproveDraftMeeting(m, user);
                if (ok) meetingDraftIds.add(m.id);
                return ok;
            })
            .map(mapMeetingItem),
        ...meetingFinalizeRaw
            .filter((m) => canFinalizePendingMeeting(m, user) && !meetingDraftIds.has(m.id))
            .map(mapMeetingItem),
    ];

    const planningsConsolidate = [];
    const planningsCoordinate = [];
    const missions = [];
    const planningEvents = [];

    const counts = {
        meetings: meetings.length,
        planningsConsolidate: 0,
        planningsCoordinate: 0,
        missions: 0,
        events: 0,
        total: meetings.length,
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
