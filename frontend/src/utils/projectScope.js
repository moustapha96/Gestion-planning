import { isPrivilegedAdmin, isResponsable } from './roles';

export const NO_RESPONSIBLE_PROJECT_TITLE = 'Aucun projet assigné';

export const NO_RESPONSIBLE_PROJECT_DESCRIPTION =
    "Vous n'êtes responsable d'aucun projet actif. Contactez l'administration pour être désigné responsable d'un projet avant de créer des réunions, missions ou événements.";

export function isUserProjectResponsible(user, project) {
    if (!user?.id || !project) return false;
    return project.responsibleId === user.id;
}

export function filterAssignableProjects(user, projects) {
    const list = projects || [];
    if (!user || isPrivilegedAdmin(user.role)) return list;
    if (isResponsable(user.role)) {
        return list.filter((p) => p.responsibleId === user.id);
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

export function resolveDefaultProjectId(urlProjectId, assignableProjects) {
    const list = assignableProjects || [];
    if (urlProjectId && list.some((p) => p.id === urlProjectId)) {
        return urlProjectId;
    }
    if (list.length >= 1) {
        return list[0].id;
    }
    return null;
}

export function projectLabel(project) {
    if (!project?.name) return '—';
    return project.code ? `${project.name} (${project.code})` : project.name;
}

export function isProjectRequiredForUser(user) {
    return isResponsable(user?.role);
}

export function projectSelectRules(user) {
    if (isProjectRequiredForUser(user)) {
        return [{ required: true, message: 'Votre projet est requis' }];
    }
    return [];
}

export function projectFieldLabel(user) {
    return isProjectRequiredForUser(user) ? 'Projet' : 'Projet (optionnel)';
}

export function canSubmitWithResponsibleProject(user, assignableProjects) {
    if (!isProjectRequiredForUser(user)) return true;
    return (assignableProjects || []).length > 0;
}
