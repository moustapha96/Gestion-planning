const { toAppYmd, appDayBoundsFromYmd } = require('./calendarEvents');
const { parseHm } = require('./roomBooking');
const { publishedMeetingStatusFilter } = require('../config/meetingVisibility');

function bookingOverlaps(booking, slotStart, slotEnd) {
    const dayYmd = toAppYmd(booking.date);
    const { start: dayStart } = appDayBoundsFromYmd(dayYmd);

    const startP = parseHm(booking.startTime);
    const endP = parseHm(booking.endTime);
    if (!startP || !endP) return false;

    const bookStart = new Date(dayStart);
    bookStart.setUTCHours(startP.h, startP.m, 0, 0);
    const bookEnd = new Date(dayStart);
    bookEnd.setUTCHours(endP.h, endP.m, 0, 0);
    if (bookEnd <= bookStart) {
        bookEnd.setUTCDate(bookEnd.getUTCDate() + 1);
    }

    return slotStart < bookEnd && slotEnd > bookStart;
}

async function hasMeetingConflict(prisma, roomId, slotStart, slotEnd, excludeMeetingId = null) {
    const conflict = await prisma.meeting.findFirst({
        where: {
            roomId,
            ...publishedMeetingStatusFilter(),
            startTime: { lt: slotEnd },
            endTime: { gt: slotStart },
            ...(excludeMeetingId && { id: { not: excludeMeetingId } }),
        },
        select: { id: true },
    });
    return !!conflict;
}

/**
 * Vérifie si une salle a un conflit pour le créneau [slotStart, slotEnd].
 * excludeMeetingId : optionnel, pour exclure la réservation d'une réunion (ex: envoi)
 */
/**
 * Vérifie que la salle existe et est ACTIVE (sinon aucune réservation possible).
 */
async function isRoomActive(prisma, roomId) {
    if (!roomId) return true;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    return room && room.status === 'ACTIVE';
}

async function isRoomAvailableForSlot(prisma, roomId, slotStart, slotEnd, excludeMeetingId = null) {
    const active = await isRoomActive(prisma, roomId);
    if (!active) return false;

    const dayYmd = toAppYmd(slotStart);
    const { start: dayStart, end: dayEnd } = appDayBoundsFromYmd(dayYmd);

    const bookings = await prisma.roomBooking.findMany({
        where: {
            roomId,
            status: 'CONFIRMED',
            date: { gte: dayStart, lte: dayEnd },
            ...(excludeMeetingId && { meetingId: { not: excludeMeetingId } }),
        },
    });

    for (const b of bookings) {
        if (bookingOverlaps(b, slotStart, slotEnd)) return false;
    }

    if (await hasMeetingConflict(prisma, roomId, slotStart, slotEnd, excludeMeetingId)) {
        return false;
    }
    return true;
}

/**
 * Retourne les IDs des salles disponibles pour le créneau [slotStart, slotEnd].
 */
async function getAvailableRoomIds(prisma, slotStart, slotEnd, excludeMeetingId = null) {
    const rooms = await prisma.room.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
    });

    const available = [];
    for (const room of rooms) {
        // eslint-disable-next-line no-await-in-loop
        if (await isRoomAvailableForSlot(prisma, room.id, slotStart, slotEnd, excludeMeetingId)) {
            available.push(room.id);
        }
    }
    return available;
}

module.exports = {
    bookingOverlaps,
    hasMeetingConflict,
    isRoomAvailableForSlot,
    isRoomActive,
    getAvailableRoomIds,
};
