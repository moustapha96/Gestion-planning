const { ROLES } = require('./roles');

/**
 * Définition des permissions par rôle (affichage et documentation).
 * Les contrôles d'accès réels sont faits dans les routes (roleMiddleware, etc.).
 */
const ROLE_PERMISSIONS = {
    [ROLES.RESPONSABLE]: [
        'Consulter et soumettre son planning hebdomadaire',
        'Créer et gérer ses réunions',
        'Créer et gérer ses missions',
        'Consulter le calendrier (réunions, missions, plannings)',
        'Consulter et réserver les salles',
        'Recevoir des notifications (plannings, réunions, missions)',
        'Modifier son profil et mot de passe',
    ],
    [ROLES.CONSOLIDATEUR]: [
        'Tout ce que peut faire un Responsable',
        'Consolider les plannings soumis par les responsables',
        'Consulter les plannings de tous les responsables',
    ],
    [ROLES.DG]: [
        'Tout ce que peut faire un Consolidateur',
        'Valider ou retourner les plannings consolidés',
        'Valider définitivement les plannings',
    ],
    [ROLES.ADMIN]: [
        'Tout ce que peut faire un Dir. Général',
        'Gérer les utilisateurs (créer, modifier, désactiver, rôles)',
        'Envoyer un lien de réinitialisation de mot de passe',
        'Gérer les salles (créer, modifier, activer/désactiver)',
        'Gérer les notifications (envoyer aux utilisateurs)',
        'Consulter les journaux d\'audit',
        'Accès à la page Administration',
        'Vue globale des plannings : créer pour un utilisateur, soumettre, consolider, valider, retourner, supprimer',
    ],
    [ROLES.SUPER_ADMIN]: [
        'Tout ce que peut faire un Administrateur',
        'Attribuer le rôle Super administrateur (réservé au premier bootstrap ou à un super admin)',
        'Voir et modérer toutes les conversations privées (audit messagerie)',
        'Supprimer tout message de discussion (privé ou réunion) pour modération',
        'Recherche globale sur l’ensemble des messages privés',
    ],
};

const ROLE_LABELS = {
    [ROLES.RESPONSABLE]: 'Responsable',
    [ROLES.CONSOLIDATEUR]: 'Consolidateur',
    [ROLES.DG]: 'Directeur Général',
    [ROLES.ADMIN]: 'Administrateur',
    [ROLES.SUPER_ADMIN]: 'Super administrateur',
};

module.exports = {
    ROLE_PERMISSIONS,
    ROLE_LABELS,
};
