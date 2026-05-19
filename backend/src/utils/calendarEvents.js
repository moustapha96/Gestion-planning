const { APP_TIMEZONE } = require('../config/timezone');

/** Date civile YYYY-MM-DD en fuseau applicatif (évite le décalage UTC). */
function toAppYmd(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

/**
 * Bornes du jour civil en APP_TIMEZONE.
 * Africa/Dakar = UTC+0 sans DST → minuit civil = minuit UTC pour ce YYYY-MM-DD.
 */
function appDayBounds(ref = new Date()) {
    const ymd = toAppYmd(ref);
    return appDayBoundsFromYmd(ymd);
}

function appDayBoundsFromYmd(ymd) {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        return { ymd: '', start: new Date(0), end: new Date(0) };
    }
    return {
        ymd,
        start: new Date(`${ymd}T00:00:00.000Z`),
        end: new Date(`${ymd}T23:59:59.999Z`),
    };
}

/** Événement horodaté qui chevauche un jour civil (clé YYYY-MM-DD). */
function eventOverlapsAppDay(startTime, endTime, ymd) {
    const { start, end } = appDayBoundsFromYmd(ymd);
    const st = new Date(startTime);
    const en = new Date(endTime || startTime);
    if (Number.isNaN(st.getTime())) return false;
    return st < end && en > start;
}

/**
 * Filtre Prisma : événement avec startTime/endTime qui chevauche [rangeStart, rangeEnd].
 * (mission ou réunion sur plusieurs jours apparaît dans la période affichée)
 */
function timedEventOverlapsRange(rangeStart, rangeEnd) {
    return {
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
    };
}

function mapMissionToCalendarEvent(mission) {
    return {
        id: mission.id,
        type: 'mission',
        title: mission.title,
        date: toAppYmd(mission.startTime),
        startTime: mission.startTime,
        endTime: mission.endTime,
        description: mission.description,
        location: mission.location,
        organizer: mission.createdBy?.name,
        status: mission.status,
        missionId: mission.id,
    };
}

function mapMeetingToCalendarEvent(meeting) {
    return {
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        date: toAppYmd(meeting.startTime),
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        description: meeting.agenda,
        room: meeting.room?.name,
        organizer: meeting.organizer?.name,
        status: meeting.status,
        meetingId: meeting.id,
    };
}

module.exports = {
    toAppYmd,
    appDayBounds,
    appDayBoundsFromYmd,
    eventOverlapsAppDay,
    timedEventOverlapsRange,
    mapMissionToCalendarEvent,
    mapMeetingToCalendarEvent,
};
