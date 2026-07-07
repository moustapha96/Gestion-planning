const { ROLES, isPrivilegedAdmin } = require('./roles');
const {
    isPendingConsolidatorValidation,
    isPendingCoordinatorValidation,
} = require('./planningWorkflow');
const {
    canApproveDraftMeeting,
    canCoordinateDraftMeeting,
    canConsolidatePendingMeeting,
    canFinalizePendingMeeting,
    isGlobalConsolidatorRole,
} = require('../services/validationPolicy.service');

/** Réunions visibles hors calendrier (listes, salles, disponibilités). */
const PUBLISHED_MEETING_STATUSES = ['SENT', 'CONFIRMED', 'COMPLETED'];

/** Réunions entièrement validées — seules autorisées sur le calendrier. */
const CALENDAR_MEETING_STATUSES = ['CONFIRMED', 'COMPLETED'];

function isPublishedMeetingStatus(status) {
    return PUBLISHED_MEETING_STATUSES.includes(status);
}

function isCalendarMeetingStatus(status) {
    return CALENDAR_MEETING_STATUSES.includes(status);
}

function publishedMeetingStatusFilter() {
    return { status: { in: PUBLISHED_MEETING_STATUSES } };
}

function calendarMeetingStatusFilter() {
    return { status: { in: CALENDAR_MEETING_STATUSES } };
}

/** Brouillons responsable visibles par le coordinateur du projet (étape 1). */
function coordinatorDraftMeetingFilter(user) {
    if (!user?.id) return null;
    return {
        status: 'DRAFT',
        project: { coordinatorId: user.id },
    };
}

/** Réunions validées par le coordinateur, en attente consolidation (étape 2). */
function consolidatorPendingMeetingFilter(user) {
    if (!user?.id) return null;
    const orClauses = [{ project: { consolidatorId: user.id } }];
    if (user.directionId) {
        orClauses.push({
            OR: [
                {
                    directionId: user.directionId,
                    OR: [
                        { project: { is: null } },
                        { project: { consolidatorId: null } },
                    ],
                },
                {
                    project: {
                        consolidatorId: null,
                        OR: [
                            { responsible: { directionId: user.directionId } },
                            { coordinator: { directionId: user.directionId } },
                        ],
                    },
                },
            ],
        });
    }
    if (isGlobalConsolidatorRole(user)) {
        orClauses.push(
            { project: { is: null }, directionId: null },
            { project: { consolidatorId: null }, directionId: null },
        );
    }
    if (orClauses.length === 1) {
        return {
            status: 'CONSOLIDATOR_PENDING',
            ...orClauses[0],
        };
    }
    return {
        status: 'CONSOLIDATOR_PENDING',
        OR: orClauses,
    };
}

/** Legacy : réunions consolidées d'abord, en attente coordinateur. */
function legacyCoordinatorPendingMeetingFilter(user) {
    if (!user?.id) return null;
    return {
        status: { in: require('./planningWorkflow').LEGACY_PENDING_COORDINATOR_STATUSES },
        project: { coordinatorId: user.id },
    };
}

/** Responsable : uniquement les réunions dont il est organisateur. */
function responsableMeetingScope(user) {
    if (!user?.id || user.role !== ROLES.RESPONSABLE) return null;
    return { organizerId: user.id };
}

/** Réunions « personnelles » d'un utilisateur : organisateur ou invité. */
function ownMeetingScope(user) {
    if (!user?.id) return null;
    return {
        OR: [
            { organizerId: user.id },
            { invitations: { some: { userId: user.id } } },
        ],
    };
}

function meetingCalendarWhereForUser(_user) {
    return calendarMeetingStatusFilter();
}

/**
 * Page « Réunions » : chaque utilisateur ne voit QUE ses propres réunions
 * (organisateur ou invité). Les réunions à valider sont accessibles
 * uniquement via la page « À valider ». Les admins privilégiés voient tout.
 */
function meetingListWhereForUser(user) {
    if (isPrivilegedAdmin(user?.role)) {
        return { status: { not: 'CANCELLED' } };
    }
    return ownMeetingScope(user) || { organizerId: '__none__' };
}

/** Toute réunion doit passer par le circuit coordinateur → consolidateur, sans exception. */
function requiresConsolidatorApproval() {
    return true;
}

function canPublishMeeting(meeting, user) {
    if (!meeting || !user) return false;
    // Jamais de publication directe depuis DRAFT — étape coordinateur obligatoire (approve-coordinator).
    if (meeting.status === 'DRAFT') return false;
    if (isPrivilegedAdmin(user?.role)) {
        return isPendingConsolidatorValidation(meeting.status)
            || isPendingCoordinatorValidation(meeting.status)
            || ['SENT', 'CONFIRMED'].includes(meeting.status);
    }
    if (isPendingConsolidatorValidation(meeting.status)) {
        return canConsolidatePendingMeeting(meeting, user);
    }
    if (isPendingCoordinatorValidation(meeting.status)) {
        return canFinalizePendingMeeting(meeting, user);
    }
    if (['SENT', 'CONFIRMED'].includes(meeting.status)) {
        return meeting.organizerId === user.id;
    }
    return false;
}

function canConsolidateMeeting(meeting, user) {
    return canConsolidatePendingMeeting(meeting, user);
}

function canCoordinateMeeting(meeting, user) {
    return canCoordinateDraftMeeting(meeting, user);
}

function canFinalizeMeeting(meeting, user) {
    return canFinalizePendingMeeting(meeting, user);
}

function canManageMeeting(meeting, user) {
    if (!meeting || !user?.id) return false;
    return meeting.organizerId === user.id || isPrivilegedAdmin(user?.role);
}

function canEditMeeting(meeting, user) {
    if (!canManageMeeting(meeting, user)) return false;
    return meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED';
}

function canViewMeetingForUser(meeting, user) {
    if (!meeting || !user?.id) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (
        meeting.status === 'DRAFT'
        && meeting.project?.coordinatorId === user.id
    ) {
        return true;
    }
    if (
        isPendingConsolidatorValidation(meeting.status)
        && canConsolidatePendingMeeting(meeting, user)
    ) {
        return true;
    }
    if (
        isPendingCoordinatorValidation(meeting.status)
        && meeting.project?.coordinatorId === user.id
    ) {
        return true;
    }
    return (
        meeting.organizerId === user.id
        || (meeting.invitations || []).some((inv) => inv.userId === user.id)
    );
}

module.exports = {
    PUBLISHED_MEETING_STATUSES,
    CALENDAR_MEETING_STATUSES,
    isPublishedMeetingStatus,
    isCalendarMeetingStatus,
    publishedMeetingStatusFilter,
    calendarMeetingStatusFilter,
    meetingCalendarWhereForUser,
    meetingListWhereForUser,
    requiresConsolidatorApproval,
    canPublishMeeting,
    canConsolidateMeeting,
    canCoordinateMeeting,
    canFinalizeMeeting,
    canManageMeeting,
    canEditMeeting,
    canViewMeetingForUser,
    responsableMeetingScope,
    ownMeetingScope,
};
