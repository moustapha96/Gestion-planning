/**
 * Résolution des types d'événement (PlanningEvent : code + FK).
 */
async function resolvePlanningEventTypeFields(prisma, { type, eventTypeId }) {
    if (eventTypeId) {
        const et = await prisma.eventType.findFirst({ where: { id: eventTypeId, isActive: true } });
        if (!et) {
            const err = new Error('Type d\'événement invalide ou inactif.');
            err.statusCode = 400;
            throw err;
        }
        return { type: et.code, eventTypeId: et.id };
    }
    const t = type ? String(type).toUpperCase().trim() : 'REUNION';
    const et = await prisma.eventType.findFirst({ where: { code: t, isActive: true } });
    return { type: t, eventTypeId: et ? et.id : null };
}

async function resolveMeetingEventTypeId(prisma, eventTypeId) {
    if (eventTypeId === undefined) return undefined;
    if (eventTypeId === null || eventTypeId === '') return null;
    const et = await prisma.eventType.findFirst({ where: { id: eventTypeId, isActive: true } });
    if (!et) {
        const err = new Error('Type d\'événement invalide ou inactif.');
        err.statusCode = 400;
        throw err;
    }
    return et.id;
}

module.exports = {
    resolvePlanningEventTypeFields,
    resolveMeetingEventTypeId,
};
