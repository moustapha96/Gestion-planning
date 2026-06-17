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

/** Réunions visibles sur le calendrier public / page d'accueil. */
const PUBLISHED_MEETING_STATUSES = ['SENT', 'CONFIRMED', 'COMPLETED'];

function isPublishedMeetingStatus(status) {
    return PUBLISHED_MEETING_STATUSES.includes(status);
}

function publishedMeetingStatusFilter() {
    return { status: { in: PUBLISHED_MEETING_STATUSES } };
}

/** Brouillons responsable visibles par le coordinateur du projet (étape 1). */
function coordinatorDraftMeetingFilter(user) {
    if (!user?.id) return null;
    return {
        status: 'DRAFT',
        organizer: { role: ROLES.RESPONSABLE },
        project: { coordinatorId: user.id },
    };
}

/** Réunions validées par le coordinateur, en attente du rôle Consolidateur (étape 2). */
function consolidatorPendingMeetingFilter(user) {
    if (!isGlobalConsolidatorRole(user)) return null;
    return {
        status: 'CONSOLIDATOR_PENDING',
        organizer: { role: ROLES.RESPONSABLE },
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

function meetingCalendarWhereForUser(_user) {
    return publishedMeetingStatusFilter();
}

function meetingListWhereForUser(user) {
    const ownOnly = responsableMeetingScope(user);
    if (ownOnly) return ownOnly;
    if (isPrivilegedAdmin(user?.role)) {
        return { status: { not: 'CANCELLED' } };
    }
    const draftAsCoordinator = coordinatorDraftMeetingFilter(user);
    const pendingConsolidator = consolidatorPendingMeetingFilter(user);
    const legacyPending = legacyCoordinatorPendingMeetingFilter(user);
    return {
        OR: [
            { organizerId: user.id },
            { invitations: { some: { userId: user.id } } },
            ...(draftAsCoordinator ? [draftAsCoordinator] : []),
            ...(pendingConsolidator ? [pendingConsolidator] : []),
            ...(legacyPending ? [legacyPending] : []),
        ],
    };
}

function requiresConsolidatorApproval(organizerRole) {
    return organizerRole === ROLES.RESPONSABLE;
}

function canPublishMeeting(meeting, user) {
    if (!meeting || !user) return false;
    if (isPrivilegedAdmin(user?.role)) {
        return meeting.status === 'DRAFT'
            || isPendingConsolidatorValidation(meeting.status)
            || isPendingCoordinatorValidation(meeting.status);
    }
    if (isPendingConsolidatorValidation(meeting.status)) {
        return canConsolidatePendingMeeting(meeting, user);
    }
    if (isPendingCoordinatorValidation(meeting.status)) {
        return canFinalizePendingMeeting(meeting, user);
    }
    if (meeting.status !== 'DRAFT') return false;
    const organizerRole = meeting.organizer?.role;
    if (requiresConsolidatorApproval(organizerRole)) {
        return canApproveDraftMeeting(meeting, user);
    }
    return meeting.organizerId === user.id;
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
    const ownOnly = responsableMeetingScope(user);
    if (ownOnly) return meeting.organizerId === user.id;
    if (isPrivilegedAdmin(user.role)) return true;
    if (
        meeting.status === 'DRAFT'
        && meeting.organizer?.role === ROLES.RESPONSABLE
        && meeting.project?.coordinatorId === user.id
    ) {
        return true;
    }
    if (
        isPendingConsolidatorValidation(meeting.status)
        && isGlobalConsolidatorRole(user)
        && meeting.organizer?.role === ROLES.RESPONSABLE
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
    isPublishedMeetingStatus,
    publishedMeetingStatusFilter,
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
};
