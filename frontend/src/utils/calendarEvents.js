import { appDayjs, appYmd, APP_TIMEZONE } from './datetime';

/** Jour civil d'un événement (fuseau Dakar). */
export function eventDayKey(ev) {
    if (ev?.date && /^\d{4}-\d{2}-\d{2}$/.test(ev.date)) return ev.date;
    const raw = ev?.startTime || ev?.time;
    if (raw) return appYmd(raw);
    return '';
}

/** L'événement chevauche ce jour (missions / réunions multi-jours). */
export function eventOverlapsDay(ev, dayYmd) {
    if (!dayYmd) return false;
    const rawStart = ev?.startTime || ev?.time;
    if (!rawStart) return eventDayKey(ev) === dayYmd;

    const start = appDayjs(rawStart);
    const end = appDayjs(ev.endTime || rawStart);
    if (!start.isValid()) return eventDayKey(ev) === dayYmd;

    const day = appDayjs(dayYmd).startOf('day');
    const dayEnd = day.endOf('day');
    return !start.isAfter(dayEnd) && !end.isBefore(day);
}

/**
 * Découpe un événement sur un jour pour la grille horaire (début/fin réels ce jour-là).
 */
export function segmentEventForDay(ev, dayYmd) {
    if (!eventOverlapsDay(ev, dayYmd)) return null;

    const rawStart = ev.startTime || ev.time;
    if (!rawStart) return { ...ev, date: dayYmd };

    const start = appDayjs(rawStart);
    const end = appDayjs(ev.endTime || rawStart);
    const dayStart = appDayjs(dayYmd).startOf('day');
    const dayEnd = dayStart.endOf('day');

    const segStart = start.isAfter(dayStart) ? start : dayStart;
    const segEnd = end.isBefore(dayEnd) ? end : dayEnd;

    return {
        ...ev,
        date: dayYmd,
        startTime: segStart.toISOString(),
        endTime: segEnd.toISOString(),
    };
}

/** Construit la map colonne YYYY-MM-DD → événements (avec segments multi-jours). */
export function buildEventsMapForDays(events, dayYmdList) {
    const map = {};
    for (const ymd of dayYmdList) {
        map[ymd] = [];
    }
    for (const ev of events) {
        const expand = (ev.type === 'mission' || ev.type === 'meeting')
            && (ev.startTime || ev.time)
            && ev.endTime;
        if (expand) {
            for (const ymd of dayYmdList) {
                const seg = segmentEventForDay(ev, ymd);
                if (seg) map[ymd].push(seg);
            }
        } else {
            const k = eventDayKey(ev);
            if (k && map[k]) map[k].push(ev);
        }
    }
    for (const ymd of dayYmdList) {
        map[ymd].sort((a, b) => {
            const ta = appDayjs(a.startTime || a.time).valueOf();
            const tb = appDayjs(b.startTime || b.time).valueOf();
            return ta - tb;
        });
    }
    return map;
}

export function formatTimeInAppTz(timeStr) {
    if (!timeStr) return '';
    const d = appDayjs(timeStr);
    if (!d.isValid()) {
        const m = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
        if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
        return '';
    }
    return d.format('HH:mm');
}

export { APP_TIMEZONE };
