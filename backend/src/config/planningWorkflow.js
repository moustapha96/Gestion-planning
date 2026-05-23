/** Après consolidation : attente du coordinateur de projet désigné. */
const COORDINATOR_PENDING = 'COORDINATOR_PENDING';
/** Alias historiques (plannings existants). */
const CP_PENDING = 'CP_PENDING';
const SG_PENDING = 'SG_PENDING';
const DG_PENDING = 'DG_PENDING';
const LEGACY_IN_CONSOLIDATION = 'IN_CONSOLIDATION';

const PENDING_COORDINATOR_STATUSES = [
    COORDINATOR_PENDING,
    CP_PENDING,
    SG_PENDING,
    DG_PENDING,
    LEGACY_IN_CONSOLIDATION,
];

function isPendingCoordinatorValidation(status) {
    return PENDING_COORDINATOR_STATUSES.includes(status);
}

/** @deprecated utiliser isPendingCoordinatorValidation */
function isPendingValidation(status) {
    return isPendingCoordinatorValidation(status);
}

const STATUS_AFTER_CONSOLIDATION = COORDINATOR_PENDING;

module.exports = {
    COORDINATOR_PENDING,
    CP_PENDING,
    SG_PENDING,
    DG_PENDING,
    LEGACY_IN_CONSOLIDATION,
    PENDING_COORDINATOR_STATUSES,
    isPendingCoordinatorValidation,
    isPendingValidation,
    STATUS_AFTER_CONSOLIDATION,
};
