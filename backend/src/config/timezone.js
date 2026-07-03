/**
 * Fuseau horaire métier : GMT+0 (UTC).
 * Africa/Dakar est équivalent (UTC+0 sans DST) ; UTC est le défaut explicite.
 * Les serveurs peuvent être en Europe — on force TZ Node pour crons et « aujourd'hui ».
 */

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

/** À appeler au démarrage (server.js), avant les jobs cron. */
function applyProcessTimezone() {
    if (!process.env.TZ) {
        process.env.TZ = APP_TIMEZONE;
    }
    if (!process.env.APP_TIMEZONE) {
        process.env.APP_TIMEZONE = APP_TIMEZONE;
    }
}

/** Options node-cron : exécuter à l'heure civile GMT+0, pas heure locale du serveur. */
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
