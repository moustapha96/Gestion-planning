export const AUDIT_ACTIONS = [
    { value: 'HTTP_GET', label: 'Requête GET' },
    { value: 'HTTP_POST', label: 'Requête POST' },
    { value: 'HTTP_PUT', label: 'Requête PUT' },
    { value: 'HTTP_PATCH', label: 'Requête PATCH' },
    { value: 'HTTP_DELETE', label: 'Requête DELETE' },
    { value: 'LOGIN', label: 'Connexion' },
    { value: 'LOGIN_2FA', label: 'Connexion 2FA' },
    { value: 'CREATE_USER', label: 'Création utilisateur' },
    { value: 'DELETE_USER', label: 'Suppression utilisateur' },
    { value: 'DEACTIVATE_USER', label: 'Désactivation utilisateur' },
    { value: 'ACTIVATE_USER', label: 'Réactivation utilisateur' },
    { value: 'ADMIN_RESET_PASSWORD', label: 'Réinit. mot de passe' },
    { value: 'SEND_RESET_LINK', label: 'Lien réinitialisation envoyé' },
    { value: 'MEETING_CREATED', label: 'Réunion créée' },
    { value: 'MEETING_SENT', label: 'Convocations envoyées' },
    { value: 'MEETING_UPDATED', label: 'Réunion modifiée' },
    { value: 'MEETING_CANCELLED', label: 'Réunion annulée' },
    { value: 'MEETING_CONFIRMED', label: 'Réunion publiée' },
    { value: 'MISSION_CREATED', label: 'Mission créée' },
    { value: 'MISSION_CANCELLED', label: 'Mission annulée' },
    { value: 'MISSION_CONFIRMED', label: 'Mission confirmée' },
    { value: 'PLANNING_SUBMITTED', label: 'Planning soumis' },
    { value: 'PLANNING_CONSOLIDATED', label: 'Planning consolidé' },
    { value: 'PLANNING_VALIDATED', label: 'Planning validé' },
    { value: 'PLANNING_RETURNED', label: 'Planning retourné' },
    { value: 'PLANNING_DELETED', label: 'Planning supprimé' },
    { value: 'BACKUP_CREATED', label: 'Sauvegarde créée' },
    { value: 'BACKUP_RESTORE_DONE', label: 'Restauration terminée' },
    { value: '2FA_ENABLED', label: '2FA activée' },
    { value: '2FA_DISABLED', label: '2FA désactivée' },
];

export const AUDIT_ENTITIES = [
    { value: 'Api', label: 'API' },
    { value: 'Auth', label: 'Authentification' },
    { value: 'User', label: 'Utilisateur' },
    { value: 'Meeting', label: 'Réunion' },
    { value: 'Mission', label: 'Mission' },
    { value: 'Planning', label: 'Planning' },
    { value: 'Project', label: 'Projet' },
    { value: 'Room', label: 'Salle' },
    { value: 'Message', label: 'Messagerie' },
    { value: 'Notification', label: 'Notification' },
    { value: 'System', label: 'Système' },
    { value: 'Event', label: 'Événement' },
    { value: 'Admin', label: 'Administration' },
];

export const AUDIT_ACTION_COLORS = {
    LOGIN: 'cyan',
    LOGIN_2FA: 'cyan',
    CREATE_USER: 'green',
    DELETE_USER: 'red',
    DEACTIVATE_USER: 'volcano',
    ACTIVATE_USER: 'green',
    ADMIN_RESET_PASSWORD: 'orange',
    MEETING_CANCELLED: 'volcano',
    MISSION_CANCELLED: 'volcano',
    PLANNING_RETURNED: 'orange',
    PLANNING_VALIDATED: 'green',
    PLANNING_CONSOLIDATED: 'purple',
    BACKUP_CREATED: 'geekblue',
    BACKUP_RESTORE_DONE: 'green',
};

export function getAuditActionLabel(action) {
    if (!action) return '—';
    const found = AUDIT_ACTIONS.find((x) => x.value === action);
    if (found) return found.label;
    if (String(action).startsWith('HTTP_')) {
        const parts = String(action).split('_');
        const verb = parts[1] || 'REQ';
        const suffix = parts[2];
        if (suffix === '4XX') return `Requête ${verb} (erreur client)`;
        if (suffix === '5XX') return `Requête ${verb} (erreur serveur)`;
        return `Requête ${verb}`;
    }
    return action;
}

export function getAuditActionColor(action) {
    if (!action) return 'default';
    if (AUDIT_ACTION_COLORS[action]) return AUDIT_ACTION_COLORS[action];
    if (String(action).startsWith('HTTP_')) {
        if (String(action).endsWith('_5XX')) return 'red';
        if (String(action).endsWith('_4XX')) return 'orange';
        return 'default';
    }
    return 'blue';
}
