const { ROLES, isPrivilegedAdmin } = require('./roles');
const { isUserProjectConsolidator } = require('../services/projectConsolidator.service');
const { userMayConsolidate } = require('../services/roleConfig.service');

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
    if (isPrivilegedAdmin(user?.role) || userMayConsolidate(user)) {
        return { status: { not: 'CANCELLED' } };
    }
    const draftAsConsolidator = projectConsolidatorDraftFilter(user);
    return {
        OR: [
            publishedMeetingStatusFilter(),
            { organizerId: user.id, status: 'DRAFT' },
            ...(draftAsConsolidator ? [draftAsConsolidator] : []),
        ],
    };
}

/** Liste des réunions (page Réunions) — le consolidateur voit les brouillons à valider. */
function meetingListWhereForUser(user) {
    const ownOnly = responsableMeetingScope(user);
    if (ownOnly) return ownOnly;
    if (isPrivilegedAdmin(user?.role) || userMayConsolidate(user)) {
        return { status: { not: 'CANCELLED' } };
    }
    const draftAsConsolidator = projectConsolidatorDraftFilter(user);
    return {
        OR: [
            { organizerId: user.id },
            { invitations: { some: { userId: user.id } } },
            ...(draftAsConsolidator ? [draftAsConsolidator] : []),
        ],
    };
}

function requiresConsolidatorApproval(organizerRole) {
    return organizerRole === ROLES.RESPONSABLE;
}

/** Peut publier (envoyer convocations + calendrier) une réunion en brouillon. */
function canPublishMeeting(meeting, user) {
    if (!meeting || meeting.status !== 'DRAFT') return false;
    if (isPrivilegedAdmin(user?.role)) return true;
    const organizerRole = meeting.organizer?.role;
    if (requiresConsolidatorApproval(organizerRole)) {
        if (userMayConsolidate(user)) return true;
        return isUserProjectConsolidator(user, meeting.project);
    }
    return meeting.organizerId === user.id;
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
    if (isPrivilegedAdmin(user.role) || userMayConsolidate(user)) return true;
    const draftAsConsolidator = projectConsolidatorDraftFilter(user);
    if (
        draftAsConsolidator
        && meeting.status === 'DRAFT'
        && meeting.project?.consolidatorId === user.id
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
    canManageMeeting,
    canEditMeeting,
    canViewMeetingForUser,
    responsableMeetingScope,
};
