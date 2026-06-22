/**
 * Migration ponctuelle : les plannings ne sont plus soumis à validation.
 * Tous les plannings restés dans un statut intermédiaire du circuit de
 * validation sont basculés en VALIDATED (ils agrègent des réunions/missions
 * déjà validées). Les statuts terminaux (CANCELLED) ne sont pas touchés.
 *
 * Usage : node scripts/migrate-plannings-validated.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const IN_FLIGHT_STATUSES = [
    'DRAFT',
    'SUBMITTED',
    'RETURNED',
    'CONSOLIDATOR_PENDING',
    'IN_CONSOLIDATION',
    'COORDINATOR_PENDING',
    'CP_PENDING',
    'SG_PENDING',
    'DG_PENDING',
];

(async () => {
    const before = await prisma.planning.groupBy({
        by: ['status'],
        _count: { _all: true },
    });
    console.log('Répartition avant migration :');
    for (const row of before) console.log(`  ${row.status} : ${row._count._all}`);

    const result = await prisma.planning.updateMany({
        where: { status: { in: IN_FLIGHT_STATUSES } },
        data: { status: 'VALIDATED', validatedAt: new Date() },
    });

    console.log('');
    console.log(`✓ ${result.count} planning(s) basculé(s) en VALIDATED.`);
    await prisma.$disconnect();
})().catch((e) => { console.error('✗ Échec migration :', e); process.exit(1); });
