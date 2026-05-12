/** Statuts de la chaîne de validation après consolidation (CP → SG → DG). */
const CP_PENDING = 'CP_PENDING';
const SG_PENDING = 'SG_PENDING';
const DG_PENDING = 'DG_PENDING';
/** Ancien statut (avant migration) : traité comme attente coordinateur. */
const LEGACY_IN_CONSOLIDATION = 'IN_CONSOLIDATION';

const PENDING_VALIDATION_STATUSES = [CP_PENDING, SG_PENDING, DG_PENDING, LEGACY_IN_CONSOLIDATION];

function isPendingValidation(status) {
    return PENDING_VALIDATION_STATUSES.includes(status);
}

/** Statut du planning juste après consolidation par le consolidateur. */
const STATUS_AFTER_CONSOLIDATION = CP_PENDING;

module.exports = {
    CP_PENDING,
    SG_PENDING,
    DG_PENDING,
    LEGACY_IN_CONSOLIDATION,
    PENDING_VALIDATION_STATUSES,
    STATUS_AFTER_CONSOLIDATION,
    isPendingValidation,
};
