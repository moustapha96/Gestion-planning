/**
 * Fuseau horaire métier : Dakar (Sénégal).
 * Les serveurs peuvent être en UTC/Europe — on force TZ Node pour crons et « aujourd'hui ».
 */

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Dakar';

/** À appeler au démarrage (server.js), avant les jobs cron. */
function applyProcessTimezone() {
    if (!process.env.TZ) {
        process.env.TZ = APP_TIMEZONE;
    }
}

/** Options node-cron : exécuter à 8h « heure de Dakar », pas heure du serveur. */
function cronTimezoneOptions() {
    return { timezone: process.env.APP_TIMEZONE || process.env.TZ || APP_TIMEZONE };
}

function formatFrDateTime(value, options = {}) {
    if (value == null || value === '') return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', {
        timeZone: APP_TIMEZONE,
        ...options,
    });
}

function formatFrDate(value, options = {}) {
    return formatFrDateTime(value, { dateStyle: 'short', timeStyle: undefined, ...options });
}

module.exports = {
    APP_TIMEZONE,
    applyProcessTimezone,
    cronTimezoneOptions,
    formatFrDateTime,
    formatFrDate,
};
