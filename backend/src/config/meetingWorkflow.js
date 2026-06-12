const {
    COORDINATOR_PENDING,
    PENDING_COORDINATOR_STATUSES,
    isPendingCoordinatorValidation,
} = require('./planningWorkflow');

/** Statuts réunion non publiés sur le calendrier public. */
const UNPUBLISHED_MEETING_STATUSES = ['DRAFT', ...PENDING_COORDINATOR_STATUSES];

function isUnpublishedMeetingStatus(status) {
    return UNPUBLISHED_MEETING_STATUSES.includes(status);
}

module.exports = {
    MEETING_PENDING_FINAL: COORDINATOR_PENDING,
    UNPUBLISHED_MEETING_STATUSES,
    isPendingMeetingFinalApproval: isPendingCoordinatorValidation,
    isUnpublishedMeetingStatus,
};
