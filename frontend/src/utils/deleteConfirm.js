/** Libellés communs pour les suppressions avec confirmation (super admin). */

export const FORCE_DELETE_OK_TEXT = 'Supprimer définitivement';

export function forceDeleteTitle(label) {
    return `Supprimer définitivement ${label} ?`;
}

export function forceDeleteDescription({ entityLabel, irreversible = true, inUse = false } = {}) {
    const parts = [];
    if (inUse) {
        parts.push(`Cet élément est encore référencé ailleurs ; les liens seront retirés avant suppression.`);
    }
    if (irreversible) {
        parts.push(`Cette action est irréversible.`);
    }
    return parts.join(' ') || `Confirmez la suppression de ${entityLabel || 'cet élément'}.`;
}
