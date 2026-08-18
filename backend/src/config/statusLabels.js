const { isPendingConsolidatorValidation, isPendingCoordinatorValidation } = require('./planningWorkflow');

const MEETING_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    CONSOLIDATOR_PENDING: 'En attente de consolidation',
    COORDINATOR_PENDING: 'En attente validation coordinateur (ancien flux)',
    CP_PENDING: 'En attente validation (ancien flux)',
    SG_PENDING: 'En attente validation (ancien flux)',
    DG_PENDING: 'En attente validation (ancien flux)',
    IN_CONSOLIDATION: 'En consolidation (ancien flux)',
    PENDING_DIRECTOR_APPROVAL: 'En attente de validation du DG',
    APPROVED: 'Validée par le DG',
    AUTO_APPROVED: 'Validée automatiquement (aucun DG)',
    REJECTED: 'Refusée par le DG',
    SENT: 'Convocations envoyées',
    CONFIRMED: 'Publiée sur le calendrier',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
};

const MISSION_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    CONSOLIDATOR_PENDING: 'En attente de consolidation',
    COORDINATOR_PENDING: 'En attente validation coordinateur (ancien flux)',
    CP_PENDING: 'En attente validation (ancien flux)',
    PENDING_DIRECTOR_APPROVAL: 'En attente de validation du DG',
    APPROVED: 'Validée par le DG',
    AUTO_APPROVED: 'Validée automatiquement (aucun DG)',
    REJECTED: 'Refusée par le DG',
    CONFIRMED: 'Confirmée sur le calendrier',
    CANCELLED: 'Annulée',
};

const PLANNING_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    SUBMITTED: 'Soumis — attente coordinateur',
    CONSOLIDATOR_PENDING: 'En attente de consolidation',
    COORDINATOR_PENDING: 'En attente validation coordinateur (ancien flux)',
    CP_PENDING: 'En attente validation (ancien flux)',
    SG_PENDING: 'En attente validation (ancien flux)',
    DG_PENDING: 'En attente validation (ancien flux)',
    IN_CONSOLIDATION: 'En consolidation (ancien flux)',
    VALIDATED: 'Validé et publié',
    RETURNED: 'Retourné pour correction',
    CANCELLED: 'Annulé',
};

function meetingStatusLabel(meeting, { awaitingCoordinator = false } = {}) {
    if (!meeting?.status) return '—';
    if (awaitingCoordinator || (meeting.status === 'DRAFT' && meeting._awaitingCoordinator)) {
        return 'En attente du coordinateur';
    }
    if (isPendingConsolidatorValidation(meeting.status)) {
        return MEETING_STATUS_LABELS.CONSOLIDATOR_PENDING;
    }
    if (isPendingCoordinatorValidation(meeting.status)) {
        return MEETING_STATUS_LABELS.COORDINATOR_PENDING;
    }
    return MEETING_STATUS_LABELS[meeting.status] || meeting.status;
}

function missionStatusLabel(mission, { awaitingCoordinator = false } = {}) {
    if (!mission?.status) return '—';
    if (awaitingCoordinator || (mission.status === 'DRAFT' && mission._awaitingCoordinator)) {
        return 'En attente du coordinateur';
    }
    if (isPendingConsolidatorValidation(mission.status)) {
        return MISSION_STATUS_LABELS.CONSOLIDATOR_PENDING;
    }
    if (isPendingCoordinatorValidation(mission.status)) {
        return MISSION_STATUS_LABELS.COORDINATOR_PENDING;
    }
    return MISSION_STATUS_LABELS[mission.status] || mission.status;
}

function planningStatusLabel(planning) {
    if (!planning?.status) return '—';
    if (isPendingConsolidatorValidation(planning.status)) {
        return PLANNING_STATUS_LABELS.CONSOLIDATOR_PENDING;
    }
    if (isPendingCoordinatorValidation(planning.status)) {
        return PLANNING_STATUS_LABELS.COORDINATOR_PENDING;
    }
    return PLANNING_STATUS_LABELS[planning.status] || planning.status;
}

function attachStatusLabel(entity, kind) {
    if (!entity) return entity;
    const label = kind === 'meeting'
        ? meetingStatusLabel(entity, { awaitingCoordinator: entity.status === 'DRAFT' })
        : kind === 'mission'
            ? missionStatusLabel(entity, { awaitingCoordinator: entity.status === 'DRAFT' })
            : planningStatusLabel(entity);
    return { ...entity, statusLabel: label };
}

module.exports = {
    MEETING_STATUS_LABELS,
    MISSION_STATUS_LABELS,
    PLANNING_STATUS_LABELS,
    meetingStatusLabel,
    missionStatusLabel,
    planningStatusLabel,
    attachStatusLabel,
};
