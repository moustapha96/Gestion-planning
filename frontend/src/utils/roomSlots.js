import { appDayjs } from './datetime';

/** Minutes depuis minuit (HH:mm ou ISO datetime, fuseau Dakar). */
export function minutesFromTimeStr(timeStr) {
    if (timeStr == null || timeStr === '') return null;
    const s = String(timeStr).trim();
    const hm = s.match(/^(\d{1,2}):(\d{2})/);
    if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
    const d = appDayjs(s);
    if (d.isValid()) return d.hour() * 60 + d.minute();
    return null;
}

function padTime(t) {
    const s = String(t || '').trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) return `${s}:00`;
    return s;
}

/** L'instant courant est dans le créneau [startTime, endTime] du jour dayYmd. */
export function isSlotActiveNow(startTime, endTime, dayYmd) {
    if (!dayYmd || !startTime) return false;
    const start = appDayjs(`${dayYmd}T${padTime(startTime)}`);
    const end = endTime
        ? appDayjs(`${dayYmd}T${padTime(endTime)}`)
        : start.add(1, 'hour');
    if (!start.isValid() || !end.isValid()) return false;
    const now = appDayjs();
    return !now.isBefore(start) && !now.isAfter(end);
}
