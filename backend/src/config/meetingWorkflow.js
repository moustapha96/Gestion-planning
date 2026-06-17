const {
    CONSOLIDATOR_PENDING,
    PENDING_VALIDATION_STATUSES,
    isPendingConsolidatorValidation,
} = require('./planningWorkflow');

/** Statuts réunion non publiés sur le calendrier public. */
const UNPUBLISHED_MEETING_STATUSES = ['DRAFT', ...PENDING_VALIDATION_STATUSES];

function isUnpublishedMeetingStatus(status) {
    return UNPUBLISHED_MEETING_STATUSES.includes(status);
}

module.exports = {
    MEETING_PENDING_FINAL: CONSOLIDATOR_PENDING,
    UNPUBLISHED_MEETING_STATUSES,
    isPendingMeetingFinalApproval: isPendingConsolidatorValidation,
    isUnpublishedMeetingStatus,
};
