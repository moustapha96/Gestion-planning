const { APP_TIMEZONE } = require('../config/timezone');
const { toAppYmd, appDayBoundsFromYmd, eventOverlapsAppDay } = require('./calendarEvents');

function parseHm(timeStr) {
    if (!timeStr) return null;
    const m = String(timeStr).trim().match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
}

/** HH:mm en fuseau applicatif (Dakar). */
function formatAppTimeHm(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: APP_TIMEZONE,
    }).replace(/\u202f/g, ' ').trim();
}

function minutesFromTimeStr(timeStr) {
    const p = parseHm(timeStr);
    if (!p) return null;
    return p.h * 60 + p.m;
}

/** Bornes Date d'une réservation sur un jour civil (Dakar = UTC+0). */
function bookingBoundsOnDay(booking, dayYmd) {
    const dk = dayYmd || toAppYmd(booking.date);
    const { start: dayStart } = appDayBoundsFromYmd(dk);
    const startP = parseHm(booking.startTime);
    const endP = parseHm(booking.endTime);
    if (!startP || !endP) return null;

    const bookStart = new Date(dayStart);
    bookStart.setUTCHours(startP.h, startP.m, 0, 0);
    const bookEnd = new Date(dayStart);
    bookEnd.setUTCHours(endP.h, endP.m, 0, 0);
    if (bookEnd <= bookStart) {
        bookEnd.setUTCDate(bookEnd.getUTCDate() + 1);
    }
    return { start: bookStart, end: bookEnd };
}

function instantInBooking(booking, instant = new Date(), dayYmd) {
    const bounds = bookingBoundsOnDay(booking, dayYmd);
    if (!bounds) return false;
    const t = instant instanceof Date ? instant : new Date(instant);
    return t >= bounds.start && t < bounds.end;
}

/** Segment horaire d'une réunion sur un jour (multi-jours). */
function meetingSegmentForDay(meeting, dayYmd) {
    if (!meeting?.roomId || !eventOverlapsAppDay(meeting.startTime, meeting.endTime, dayYmd)) {
        return null;
    }
    const { start: dayStart, end: dayEnd } = appDayBoundsFromYmd(dayYmd);
    const mStart = new Date(meeting.startTime);
    const mEnd = new Date(meeting.endTime);
    const segStart = mStart > dayStart ? mStart : dayStart;
    const segEnd = mEnd < dayEnd ? mEnd : dayEnd;
    return {
        id: `meeting-${meeting.id}-${dayYmd}`,
        startTime: formatAppTimeHm(segStart),
        endTime: formatAppTimeHm(segEnd),
        meetingTitle: meeting.title,
        meetingId: meeting.id,
    };
}

/**
 * Créneaux d'une salle pour un jour : réservations manuelles + réunions (début → fin).
 * Les réunions priment sur les RoomBooking liés (évite les doublons).
 */
function buildRoomDaySlots(roomId, dayYmd, roomBookings, meetings) {
    const meetingIds = new Set(
        (meetings || []).filter((m) => m.roomId === roomId).map((m) => m.id),
    );

    const manual = (roomBookings || [])
        .filter((b) => {
            if (b.status && b.status !== 'CONFIRMED') return false;
            if (b.meetingId && meetingIds.has(b.meetingId)) return false;
            return toAppYmd(b.date) === dayYmd;
        })
        .map((b) => ({
            id: b.id,
            startTime: b.startTime,
            endTime: b.endTime,
            meetingTitle: b.meeting?.title || null,
            meetingId: b.meetingId || null,
        }));

    const fromMeetings = (meetings || [])
        .filter((m) => m.roomId === roomId)
        .map((m) => meetingSegmentForDay(m, dayYmd))
        .filter(Boolean);

    return [...manual, ...fromMeetings].sort(
        (a, b) => (minutesFromTimeStr(a.startTime) ?? 0) - (minutesFromTimeStr(b.startTime) ?? 0),
    );
}

function findCurrentBooking(slots, instant = new Date(), dayYmd) {
    return slots.find((s) => instantInBooking(s, instant, dayYmd)) || null;
}

module.exports = {
    formatAppTimeHm,
    parseHm,
    minutesFromTimeStr,
    bookingBoundsOnDay,
    instantInBooking,
    meetingSegmentForDay,
    buildRoomDaySlots,
    findCurrentBooking,
};
