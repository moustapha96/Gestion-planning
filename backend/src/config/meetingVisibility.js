const { ROLES, isPrivilegedAdmin } = require('./roles');

/** Réunions visibles sur le calendrier public / page d'accueil. */
const PUBLISHED_MEETING_STATUSES = ['SENT', 'CONFIRMED', 'COMPLETED'];

function isPublishedMeetingStatus(status) {
    return PUBLISHED_MEETING_STATUSES.includes(status);
}

function publishedMeetingStatusFilter() {
    return { status: { in: PUBLISHED_MEETING_STATUSES } };
}

/** Filtre Prisma : réunions affichées sur le calendrier connecté. */
function meetingCalendarWhereForUser(user) {
    if (isPrivilegedAdmin(user?.role) || user?.role === ROLES.CONSOLIDATEUR) {
        return { status: { not: 'CANCELLED' } };
    }
    return {
        OR: [
            publishedMeetingStatusFilter(),
            { organizerId: user.id, status: 'DRAFT' },
        ],
    };
}

/** Liste des réunions (page Réunions) — le consolidateur voit les brouillons à valider. */
function meetingListWhereForUser(user) {
    if (isPrivilegedAdmin(user?.role) || user?.role === ROLES.CONSOLIDATEUR) {
        return { status: { not: 'CANCELLED' } };
    }
    return {
        OR: [
            { organizerId: user.id },
            { invitations: { some: { userId: user.id } } },
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
        return user?.role === ROLES.CONSOLIDATEUR;
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
};
