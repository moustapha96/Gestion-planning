const { ROLES } = require('./roles');

const ROLE_PERMISSIONS = {
    [ROLES.RESPONSABLE]: [
        'Consulter et soumettre son planning hebdomadaire',
        'Créer et gérer ses réunions, missions et événements (périmètre personnel)',
        'Consulter le calendrier et les salles',
        'Consulter le répertoire (export)',
    ],
    [ROLES.COORDINATEUR]: [
        'Valider en première étape les réunions, missions et plannings des projets coordonnés',
        'Retourner ces éléments pour correction',
        'Consulter les projets dont il est coordinateur',
    ],
    [ROLES.CONSOLIDATEUR]: [
        'Consolider les plannings soumis',
        'Valider les réunions en brouillon des responsables (consolidateur de projet ou rôle global)',
        'Voir tous les plannings et missions',
    ],
    [ROLES.ADMIN]: [
        'Administration complète (utilisateurs, salles, types d\'événements, configuration)',
        'Gérer les projets (consolidateur + coordinateur par projet)',
        'Configuration rôles ↔ directions et élévation SG/DG (Direction générale)',
        'Valider / retourner les plannings (y compris court-circuit)',
        'Gérer le répertoire',
    ],
    [ROLES.SUPER_ADMIN]: [
        'Tout ce que fait un Administrateur',
        'Supervision messagerie, suppressions forcées, documents serveur',
    ],
};

const ROLE_LABELS = {
    [ROLES.RESPONSABLE]: 'Responsable',
    [ROLES.COORDINATEUR]: 'Coordinateur',
    [ROLES.CONSOLIDATEUR]: 'Consolidateur',
    [ROLES.ADMIN]: 'Administrateur',
    [ROLES.SUPER_ADMIN]: 'Super administrateur',
};

module.exports = {
    ROLE_PERMISSIONS,
    ROLE_LABELS,
};
