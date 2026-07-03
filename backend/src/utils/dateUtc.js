const { toAppYmd, appDayBoundsFromYmd } = require('./calendarEvents');

/**
 * Parse une entrée API en Date UTC.
 * - ISO avec Z ou offset : parse natif
 * - YYYY-MM-DD : minuit UTC
 * - YYYY-MM-DDTHH:mm:ss sans fuseau : interprété comme UTC (GMT+0)
 */
function parseUtcDate(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const s = String(value).trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(`${s}T00:00:00.000Z`);
    }

    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
        const normalized = (s.includes('T') ? s : s.replace(' ', 'T')).replace(/Z$/i, '');
        const d = new Date(`${normalized}Z`);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function utcStartOfDay(ref = new Date()) {
    const ymd = toAppYmd(ref);
    return appDayBoundsFromYmd(ymd).start;
}

function utcEndOfDay(ref = new Date()) {
    const ymd = toAppYmd(ref);
    return appDayBoundsFromYmd(ymd).end;
}

function utcDayBounds(ref = new Date()) {
    const ymd = toAppYmd(ref);
    const { start, end } = appDayBoundsFromYmd(ymd);
    return { start, end, ymd };
}

function utcDayBoundsFromYmd(ymd) {
    return appDayBoundsFromYmd(ymd);
}

function utcMonthBounds(year, month1to12) {
    const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 999));
    return { start, end };
}

/** Lundi 00:00:00 UTC de la semaine contenant la date (dimanche → semaine précédente). */
function utcMondayOfWeek(ref = new Date()) {
    const d = parseUtcDate(ref) || new Date();
    const ymd = toAppYmd(d);
    const anchor = new Date(`${ymd}T12:00:00.000Z`);
    const jsDay = anchor.getUTCDay();
    const offset = jsDay === 0 ? -6 : 1 - jsDay;
    anchor.setUTCDate(anchor.getUTCDate() + offset);
    anchor.setUTCHours(0, 0, 0, 0);
    return anchor;
}

function utcWeekBounds(ref = new Date()) {
    const start = utcMondayOfWeek(ref);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
}

function utcAddDays(ref, days) {
    const d = new Date(parseUtcDate(ref) || ref);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

function utcNowParts() {
    const now = new Date();
    return {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        date: now.getUTCDate(),
    };
}

module.exports = {
    parseUtcDate,
    utcStartOfDay,
    utcEndOfDay,
    utcDayBounds,
    utcDayBoundsFromYmd,
    utcMonthBounds,
    utcMondayOfWeek,
    utcWeekBounds,
    utcAddDays,
    utcNowParts,
};
