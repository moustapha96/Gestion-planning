/**
 * Fuseau horaire applicatif : GMT+0 (UTC).
 * Indépendant du fuseau du PC / du navigateur.
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';

export const APP_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE || 'UTC';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fr');
dayjs.tz.setDefault(APP_TIMEZONE);

/** Instance dayjs en heure civile APP_TIMEZONE (GMT+0). */
export function appDayjs(value) {
    if (value == null || value === '') {
        return dayjs().tz(APP_TIMEZONE);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return dayjs.tz(`${value} 12:00:00`, APP_TIMEZONE);
    }
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
        return dayjs().tz(APP_TIMEZONE);
    }
    return parsed.tz(APP_TIMEZONE);
}

/**
 * Convertit une date/heure saisie (DatePicker) en ISO UTC.
 * L'heure affichée = heure civile GMT+0 (pas le fuseau du navigateur).
 */
export function toUtcIso(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'string') {
        if (/[zZ]$/.test(value) || /[+-]\d{2}:\d{2}$/.test(value)) {
            return dayjs(value).utc().toISOString();
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return dayjs.tz(`${value} 00:00:00`, APP_TIMEZONE).utc().toISOString();
        }
        return dayjs.tz(value, APP_TIMEZONE).utc().toISOString();
    }
    const d = dayjs.isDayjs(value) ? value : dayjs(value);
    if (!d.isValid()) return null;
    const wall = d.format('YYYY-MM-DD HH:mm:ss');
    return dayjs.tz(wall, APP_TIMEZONE).utc().toISOString();
}

export function formatDateTime(value, format = 'DD/MM/YYYY HH:mm') {
    if (value == null || value === '') return '';
    const d = appDayjs(value);
    return d.isValid() ? d.format(format) : '';
}

export function formatDate(value, format = 'DD/MM/YYYY') {
    return formatDateTime(value, format);
}

/** YYYY-MM-DD pour comparaisons (calendrier, filtres jour). */
export function appYmd(value = new Date()) {
    return appDayjs(value).format('YYYY-MM-DD');
}

/** Affichage long type liste (équivalent toLocaleString fr). */
export function formatDateTimeLocale(value, options = {}) {
    if (value == null || value === '') return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', {
        timeZone: APP_TIMEZONE,
        ...options,
    });
}

/** Date du jour « métier » en GMT+0 (pas fuseau navigateur). */
export function todayInAppTz() {
    return appDayjs();
}

/** Libellé long du jour civil (ex. « mardi 19 mai 2026 »). */
export function formatAppDateLong(value) {
    if (value == null || value === '') return '';
    const d = appDayjs(value);
    return d.isValid() ? d.format('dddd D MMMM YYYY') : '';
}

/** Minutes depuis minuit en heure GMT+0. */
export function appNowMinutes() {
    const n = appDayjs();
    if (!n.isValid()) {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }
    return n.hour() * 60 + n.minute();
}
