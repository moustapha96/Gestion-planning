/**
 * Vérifie si un créneau [slotStart, slotEnd] chevauche une réservation.
 * RoomBooking: date (DateTime), startTime "HH:mm", endTime "HH:mm"
 */
function bookingOverlaps(booking, slotStart, slotEnd) {
    const d = new Date(booking.date);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

    const [startH, startM] = booking.startTime.split(':').map((x) => parseInt(x, 10) || 0);
    const [endH, endM] = booking.endTime.split(':').map((x) => parseInt(x, 10) || 0);

    const bookStart = new Date(dayStart);
    bookStart.setHours(startH, startM, 0, 0);
    const bookEnd = new Date(dayStart);
    bookEnd.setHours(endH, endM, 0, 0);

    return slotStart < bookEnd && slotEnd > bookStart;
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

    const dayStart = new Date(slotStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(slotStart);
    dayEnd.setHours(23, 59, 59, 999);

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
    return true;
}

/**
 * Retourne les IDs des salles disponibles pour le créneau [slotStart, slotEnd].
 */
async function getAvailableRoomIds(prisma, slotStart, slotEnd) {
    const rooms = await prisma.room.findMany({
        where: { status: 'ACTIVE' },
        include: {
            bookings: {
                where: {
                    status: 'CONFIRMED',
                    date: {
                        gte: new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate(), 0, 0, 0, 0),
                        lte: new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate(), 23, 59, 59, 999),
                    },
                },
            },
        },
    });

    const available = [];
    for (const room of rooms) {
        let hasConflict = false;
        for (const b of room.bookings) {
            if (bookingOverlaps(b, slotStart, slotEnd)) {
                hasConflict = true;
                break;
            }
        }
        if (!hasConflict) available.push(room.id);
    }
    return available;
}

module.exports = {
    bookingOverlaps,
    isRoomAvailableForSlot,
    isRoomActive,
    getAvailableRoomIds,
};
