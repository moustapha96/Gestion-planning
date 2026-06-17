/** Après validation coordinateur : attente du rôle Consolidateur global. */
const CONSOLIDATOR_PENDING = 'CONSOLIDATOR_PENDING';

/** Legacy (ancien flux : consolidateur d'abord) — le coordinateur peut encore finaliser ces éléments. */
const COORDINATOR_PENDING = 'COORDINATOR_PENDING';
const CP_PENDING = 'CP_PENDING';
const SG_PENDING = 'SG_PENDING';
const DG_PENDING = 'DG_PENDING';
const LEGACY_IN_CONSOLIDATION = 'IN_CONSOLIDATION';

const PENDING_CONSOLIDATOR_STATUSES = [CONSOLIDATOR_PENDING];

const LEGACY_PENDING_COORDINATOR_STATUSES = [
    COORDINATOR_PENDING,
    CP_PENDING,
    SG_PENDING,
    DG_PENDING,
    LEGACY_IN_CONSOLIDATION,
];

/** Tous les statuts intermédiaires (non publiés sur le calendrier). */
const PENDING_VALIDATION_STATUSES = [
    ...PENDING_CONSOLIDATOR_STATUSES,
    ...LEGACY_PENDING_COORDINATOR_STATUSES,
];

/** @deprecated alias legacy */
const PENDING_COORDINATOR_STATUSES = LEGACY_PENDING_COORDINATOR_STATUSES;

function isPendingConsolidatorValidation(status) {
    return PENDING_CONSOLIDATOR_STATUSES.includes(status);
}

function isPendingCoordinatorValidation(status) {
    return LEGACY_PENDING_COORDINATOR_STATUSES.includes(status);
}

/** @deprecated utiliser isPendingConsolidatorValidation ou isPendingCoordinatorValidation */
function isPendingValidation(status) {
    return PENDING_VALIDATION_STATUSES.includes(status);
}

const STATUS_AFTER_COORDINATOR = CONSOLIDATOR_PENDING;
/** @deprecated utiliser STATUS_AFTER_COORDINATOR */
const STATUS_AFTER_CONSOLIDATION = CONSOLIDATOR_PENDING;

module.exports = {
    CONSOLIDATOR_PENDING,
    COORDINATOR_PENDING,
    CP_PENDING,
    SG_PENDING,
    DG_PENDING,
    LEGACY_IN_CONSOLIDATION,
    PENDING_CONSOLIDATOR_STATUSES,
    LEGACY_PENDING_COORDINATOR_STATUSES,
    PENDING_VALIDATION_STATUSES,
    PENDING_COORDINATOR_STATUSES,
    isPendingConsolidatorValidation,
    isPendingCoordinatorValidation,
    isPendingValidation,
    STATUS_AFTER_COORDINATOR,
    STATUS_AFTER_CONSOLIDATION,
};
