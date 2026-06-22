import {
    isPendingConsolidatorStatus,
    isPendingCoordinatorStatus,
    meetingNeedsConsolidatorApproval,
    missionNeedsConsolidatorApproval,
} from './roles';

export const MEETING_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    CONSOLIDATOR_PENDING: 'En attente de consolidation',
    COORDINATOR_PENDING: 'En attente validation coordinateur (ancien flux)',
    CP_PENDING: 'En attente validation (ancien flux)',
    SG_PENDING: 'En attente validation (ancien flux)',
    DG_PENDING: 'En attente validation (ancien flux)',
    IN_CONSOLIDATION: 'En consolidation (ancien flux)',
    SENT: 'Convocations envoyées',
    CONFIRMED: 'Publiée sur le calendrier',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
};

export const MISSION_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    CONSOLIDATOR_PENDING: 'En attente de consolidation',
    COORDINATOR_PENDING: 'En attente validation coordinateur (ancien flux)',
    CP_PENDING: 'En attente validation (ancien flux)',
    CONFIRMED: 'Confirmée sur le calendrier',
    CANCELLED: 'Annulée',
};

export const PLANNING_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    SUBMITTED: 'Soumis — attente coordinateur',
    CONSOLIDATOR_PENDING: 'En attente de consolidation',
    COORDINATOR_PENDING: 'En attente validation coordinateur (ancien flux)',
    VALIDATED: 'Validé et publié',
    RETURNED: 'Retourné pour correction',
    CANCELLED: 'Annulé',
};

export function meetingStatusLabel(meeting) {
    if (!meeting?.status) return '—';
    if (meetingNeedsConsolidatorApproval(meeting) && meeting.status === 'DRAFT') {
        return 'En attente du coordinateur';
    }
    if (isPendingConsolidatorStatus(meeting.status)) {
        return MEETING_STATUS_LABELS.CONSOLIDATOR_PENDING;
    }
    if (isPendingCoordinatorStatus(meeting.status)) {
        return MEETING_STATUS_LABELS.COORDINATOR_PENDING;
    }
    return MEETING_STATUS_LABELS[meeting.status] || meeting.status;
}

export function missionStatusLabel(mission) {
    if (!mission?.status) return '—';
    if (missionNeedsConsolidatorApproval(mission) && mission.status === 'DRAFT') {
        return 'En attente du coordinateur';
    }
    if (isPendingConsolidatorStatus(mission.status)) {
        return MISSION_STATUS_LABELS.CONSOLIDATOR_PENDING;
    }
    if (isPendingCoordinatorStatus(mission.status)) {
        return MISSION_STATUS_LABELS.COORDINATOR_PENDING;
    }
    return MISSION_STATUS_LABELS[mission.status] || mission.status;
}

export function planningStatusLabel(planning) {
    if (!planning?.status) return '—';
    if (isPendingConsolidatorStatus(planning.status)) {
        return PLANNING_STATUS_LABELS.CONSOLIDATOR_PENDING;
    }
    if (isPendingCoordinatorStatus(planning.status)) {
        return PLANNING_STATUS_LABELS.COORDINATOR_PENDING;
    }
    return PLANNING_STATUS_LABELS[planning.status] || planning.status;
}
