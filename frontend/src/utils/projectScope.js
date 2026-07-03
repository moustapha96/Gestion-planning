import { isPrivilegedAdmin, isResponsable } from './roles';

export const NO_RESPONSIBLE_PROJECT_TITLE = 'Aucun projet assigné';

export const NO_RESPONSIBLE_PROJECT_DESCRIPTION =
    "Vous n'êtes responsable ou coordinateur d'aucun projet actif. Contactez l'administration pour être désigné sur un projet avant de créer des réunions, missions ou événements.";

export function isUserProjectResponsible(user, project) {
    if (!user?.id || !project) return false;
    return project.responsibleId === user.id;
}

/** Responsable OU coordinateur désigné sur le projet : mêmes droits de création. */
export function isUserProjectResponsibleOrCoordinator(user, project) {
    if (!user?.id || !project) return false;
    return project.responsibleId === user.id || project.coordinatorId === user.id;
}

export function filterAssignableProjects(user, projects) {
    const list = projects || [];
    if (!user || isPrivilegedAdmin(user.role)) return list;
    if (isResponsable(user.role)) {
        return list.filter((p) => p.responsibleId === user.id || p.coordinatorId === user.id);
    }
    return list;
}

/** Fusionne les projets taxonomy + endpoint dédié (sans doublons). */
export function mergeResponsibleProjects(user, taxonomyProjects, myResponsibleProjects) {
    const fromTax = filterAssignableProjects(user, taxonomyProjects);
    const mine = myResponsibleProjects || [];
    const map = new Map();
    [...fromTax, ...mine].forEach((p) => {
        if (p?.id) map.set(p.id, p);
    });
    return Array.from(map.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
}

/**
 * Projet par défaut : URL explicite, ou unique projet actif.
 * Si plusieurs projets, pas de présélection (choix obligatoire).
 */
export function resolveDefaultProjectId(urlProjectId, assignableProjects) {
    const list = assignableProjects || [];
    if (urlProjectId && list.some((p) => p.id === urlProjectId)) {
        return urlProjectId;
    }
    if (list.length === 1) {
        return list[0].id;
    }
    return null;
}

export function projectLabel(project) {
    if (!project?.name) return '—';
    return project.code ? `${project.name} (${project.code})` : project.name;
}

export function projectsSummaryLabel(projects) {
    const list = projects || [];
    if (!list.length) return '';
    if (list.length === 1) return projectLabel(list[0]);
    return `${list.length} projets : ${list.map(projectLabel).join(', ')}`;
}

export function isProjectRequiredForUser(user) {
    return isResponsable(user?.role);
}

export function hasMultipleAssignableProjects(assignableProjects) {
    return (assignableProjects || []).length > 1;
}

export function projectSelectRules(user, assignableProjects) {
    if (!isProjectRequiredForUser(user)) return [];
    const multiple = hasMultipleAssignableProjects(assignableProjects);
    return [{
        required: true,
        message: multiple ? 'Choisissez le projet concerné' : 'Votre projet est requis',
    }];
}

export function projectFieldLabel(user, assignableProjects) {
    if (!isProjectRequiredForUser(user)) return 'Projet (optionnel)';
    if (hasMultipleAssignableProjects(assignableProjects)) {
        return 'Projet (choisissez parmi vos projets)';
    }
    return 'Projet';
}

export function canSubmitWithResponsibleProject(user, assignableProjects) {
    if (!isProjectRequiredForUser(user)) return true;
    return (assignableProjects || []).length > 0;
}
