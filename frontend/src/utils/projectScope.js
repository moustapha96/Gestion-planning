import { isPrivilegedAdmin, isResponsable } from './roles';

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

export function isProjectRequiredForUser(user) {
    return isResponsable(user?.role);
}

export function projectSelectRules(user) {
    if (isProjectRequiredForUser(user)) {
        return [{ required: true, message: 'Sélectionnez votre projet' }];
    }
    return [];
}

export function projectFieldLabel(user) {
    return isProjectRequiredForUser(user) ? 'Projet' : 'Projet (optionnel)';
}
