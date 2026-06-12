const { ROLES, isPrivilegedAdmin } = require('./roles');
const { isUserProjectConsolidator } = require('../services/projectConsolidator.service');
const { isPendingCoordinatorValidation } = require('./planningWorkflow');
const {
    canApproveDraftMeeting,
    canConsolidateDraftMeeting,
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

/** Brouillons à valider pour l'utilisateur désigné consolidateur d'un projet. */
function projectConsolidatorDraftFilter(user) {
    if (!user?.id) return null;
    return { status: 'DRAFT', project: { consolidatorId: user.id } };
}

/** Réunions consolidées, en attente de validation finale (coordinateur ou rôle dédié). */
function meetingPendingFinalizeFilter(user) {
    if (!user?.id) return null;
    const or = [{ project: { coordinatorId: user.id } }];
    if (isGlobalConsolidatorRole(user)) {
        or.push({ project: { coordinatorId: null } });
        or.push({ projectId: null });
    }
    return { status: 'COORDINATOR_PENDING', OR: or };
}

/** Responsable : uniquement les réunions dont il est organisateur. */
function responsableMeetingScope(user) {
    if (!user?.id || user.role !== ROLES.RESPONSABLE) return null;
    return { organizerId: user.id };
}

/** Filtre Prisma : réunions affichées sur le calendrier connecté. */
function meetingCalendarWhereForUser(user) {
    const ownOnly = responsableMeetingScope(user);
    if (ownOnly) {
        return { ...ownOnly, status: { not: 'CANCELLED' } };
    }
    const draftAsConsolidator = projectConsolidatorDraftFilter(user);
    const pendingFinalize = meetingPendingFinalizeFilter(user);
    if (isPrivilegedAdmin(user?.role)) {
        return { status: { not: 'CANCELLED' } };
    }
    return {
        OR: [
            publishedMeetingStatusFilter(),
            { organizerId: user.id, status: { in: ['DRAFT', 'COORDINATOR_PENDING'] } },
            ...(draftAsConsolidator ? [draftAsConsolidator] : []),
            ...(pendingFinalize ? [pendingFinalize] : []),
        ],
    };
}

/** Liste des réunions (page Réunions) — le consolidateur voit les brouillons à valider. */
function meetingListWhereForUser(user) {
    const ownOnly = responsableMeetingScope(user);
    if (ownOnly) return ownOnly;
    if (isPrivilegedAdmin(user?.role)) {
        return { status: { not: 'CANCELLED' } };
    }
    const draftAsConsolidator = projectConsolidatorDraftFilter(user);
    const pendingFinalize = meetingPendingFinalizeFilter(user);
    return {
        OR: [
            { organizerId: user.id },
            { invitations: { some: { userId: user.id } } },
            ...(draftAsConsolidator ? [draftAsConsolidator] : []),
            ...(pendingFinalize ? [pendingFinalize] : []),
        ],
    };
}

function requiresConsolidatorApproval(organizerRole) {
    return organizerRole === ROLES.RESPONSABLE;
}

/** Peut publier (envoyer convocations + calendrier) une réunion. */
function canPublishMeeting(meeting, user) {
    if (!meeting || !user) return false;
    if (isPrivilegedAdmin(user?.role)) {
        return meeting.status === 'DRAFT' || isPendingCoordinatorValidation(meeting.status);
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

/** Peut consolider une réunion en brouillon (1er palier, sans publication). */
function canConsolidateMeeting(meeting, user) {
    return canConsolidateDraftMeeting(meeting, user);
}

/** Peut valider définitivement une réunion en attente (2e palier → publication). */
function canFinalizeMeeting(meeting, user) {
    return canFinalizePendingMeeting(meeting, user);
}

/** Annuler, terminer, rouvrir, participants, pièces jointes. */
function canManageMeeting(meeting, user) {
    if (!meeting || !user?.id) return false;
    return meeting.organizerId === user.id || isPrivilegedAdmin(user?.role);
}

/** Modifier le contenu / créneau (hors réunion annulée ou terminée). */
function canEditMeeting(meeting, user) {
    if (!canManageMeeting(meeting, user)) return false;
    return meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED';
}

/** Accès au détail d'une réunion (aligné sur les filtres liste / calendrier). */
function canViewMeetingForUser(meeting, user) {
    if (!meeting || !user?.id) return false;
    const ownOnly = responsableMeetingScope(user);
    if (ownOnly) return meeting.organizerId === user.id;
    if (isPrivilegedAdmin(user.role)) return true;
    const draftAsConsolidator = projectConsolidatorDraftFilter(user);
    if (
        draftAsConsolidator
        && meeting.status === 'DRAFT'
        && meeting.project?.consolidatorId === user.id
    ) {
        return true;
    }
    const pendingFinalize = meetingPendingFinalizeFilter(user);
    if (
        pendingFinalize
        && isPendingCoordinatorValidation(meeting.status)
        && (
            meeting.project?.coordinatorId === user.id
            || (isGlobalConsolidatorRole(user) && !meeting.project?.coordinatorId)
        )
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
    canFinalizeMeeting,
    canManageMeeting,
    canEditMeeting,
    canViewMeetingForUser,
    responsableMeetingScope,
};
