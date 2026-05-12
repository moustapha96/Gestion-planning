/** Valeur `accept` pour les champs fichier PDF uniquement */
export const PDF_ACCEPT = 'application/pdf,.pdf';

/** Contrôle côté client avant envoi (complète le filtre serveur). */
export function isAcceptedPdfFile(file) {
    if (!file) return false;
    const name = String(file.name || '').toLowerCase();
    if (!name.endsWith('.pdf')) return false;
    const type = String(file.type || '').toLowerCase();
    return !type || type === 'application/pdf' || type === 'application/octet-stream';
}
