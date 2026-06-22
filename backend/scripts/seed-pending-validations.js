/**
 * Seed de démonstration : crée des réunions et missions en attente de la
 * PREMIÈRE validation (coordinateur — étape 1/2) et déclenche les
 * notifications associées (in-app + e-mail coordinateur).
 *
 * Usage :
 *   node scripts/seed-pending-validations.js
 *
 * Options (variables d'environnement) :
 *   SEED_COUNT=3            Nombre d'items par type (défaut : 3)
 *   SEED_SEND_EMAILS=0      Désactive l'envoi d'e-mails réels (in-app seulement)
 *   SEED_RESPONSABLE_EMAIL  Force le responsable créateur (sinon : 1er trouvé)
 *
 * Les items créés sont préfixés « [DEMO] » pour être repérables/supprimables.
 */
const { PrismaClient } = require('@prisma/client');
const { notifyMeetingPendingCoordinatorReview } = require('../src/services/projectCoordinator.service');
const { notifyMissionPendingCoordinatorReview } = require('../src/services/projectCoordinator.service');

const prisma = new PrismaClient();

const COUNT = Math.max(1, parseInt(process.env.SEED_COUNT || '3', 10));
const SEND_EMAILS = process.env.SEED_SEND_EMAILS !== '0';

function plusDays(days, hour = 9) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
}

/** Responsable créateur + projet doté d'un coordinateur (circuit étape 1 garanti). */
async function resolveContext() {
    const respWhere = {
        role: 'RESPONSABLE',
        isActive: true,
        isDeleted: false,
        ...(process.env.SEED_RESPONSABLE_EMAIL ? { email: process.env.SEED_RESPONSABLE_EMAIL } : {}),
    };

    // 1) Responsable dont le projet a un coordinateur désigné.
    const responsables = await prisma.user.findMany({
        where: respWhere,
        select: {
            id: true, name: true, email: true, directionId: true,
            project: {
                select: {
                    id: true, name: true, code: true,
                    coordinatorId: true, consolidatorId: true,
                    coordinator: { select: { name: true, email: true } },
                    consolidator: { select: { name: true, email: true } },
                },
            },
        },
    });

    const withCoord = responsables.find((u) => u.project?.coordinatorId);
    if (withCoord) return { creator: withCoord, project: withCoord.project };

    // 2) Repli : 1er projet actif avec coordinateur + 1er responsable.
    const project = await prisma.project.findFirst({
        where: { isActive: true, coordinatorId: { not: null } },
        select: {
            id: true, name: true, code: true,
            coordinatorId: true, consolidatorId: true,
            coordinator: { select: { name: true, email: true } },
            consolidator: { select: { name: true, email: true } },
        },
    });
    if (project && responsables[0]) return { creator: responsables[0], project };

    return { creator: responsables[0] || null, project: null };
}

async function main() {
    const { creator, project } = await resolveContext();

    if (!creator) {
        console.error('✗ Aucun responsable actif trouvé. Lancez d\'abord le seed des comptes de test.');
        process.exit(1);
    }
    if (!project?.coordinatorId) {
        console.error('✗ Aucun projet actif avec coordinateur désigné. Désignez un coordinateur sur un projet d\'abord.');
        process.exit(1);
    }

    console.log('Contexte de démonstration :');
    console.log(`  Responsable (créateur) : ${creator.name} <${creator.email}>`);
    console.log(`  Projet                 : ${project.name}${project.code ? ` (${project.code})` : ''}`);
    console.log(`  Coordinateur (étape 1) : ${project.coordinator?.name} <${project.coordinator?.email}>`);
    console.log(`  Consolidateur (étape 2): ${project.consolidator?.name || '—'} <${project.consolidator?.email || '—'}>`);
    console.log(`  Envoi e-mails réels    : ${SEND_EMAILS ? 'OUI' : 'non (in-app uniquement)'}`);
    console.log('');

    let meetings = 0;
    let missions = 0;

    // ── Réunions en DRAFT (attente coordinateur) ──────────────────────
    for (let i = 1; i <= COUNT; i += 1) {
        const start = plusDays(i + 1, 9 + i);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const created = await prisma.meeting.create({
            data: {
                title: `[DEMO] Réunion en attente coordinateur #${i}`,
                agenda: `Point projet ${project.name} — ordre du jour de démonstration #${i}.`,
                organizerId: creator.id,
                projectId: project.id,
                directionId: creator.directionId || null,
                startTime: start,
                endTime: end,
                status: 'DRAFT',
            },
            include: {
                organizer: { select: { id: true, name: true, email: true, role: true } },
                project: { select: { id: true, name: true, code: true, coordinatorId: true, consolidatorId: true } },
                room: { select: { id: true, name: true } },
            },
        });
        meetings += 1;
        if (SEND_EMAILS) {
            await notifyMeetingPendingCoordinatorReview(prisma, created, created.organizer);
        }
        console.log(`  ✓ Réunion créée (DRAFT) : ${created.title}`);
    }

    // ── Missions en DRAFT (attente coordinateur) ──────────────────────
    for (let i = 1; i <= COUNT; i += 1) {
        const start = plusDays(i + 1, 14);
        const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
        const created = await prisma.mission.create({
            data: {
                title: `[DEMO] Mission en attente coordinateur #${i}`,
                description: `Mission de démonstration #${i} pour le projet ${project.name}.`,
                location: `Site ${project.name} #${i}`,
                createdById: creator.id,
                projectId: project.id,
                directionId: creator.directionId || null,
                startTime: start,
                endTime: end,
                status: 'DRAFT',
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                project: { select: { id: true, name: true, code: true, coordinatorId: true, consolidatorId: true } },
            },
        });
        missions += 1;
        if (SEND_EMAILS) {
            await notifyMissionPendingCoordinatorReview(prisma, created, created.createdBy);
        }
        console.log(`  ✓ Mission créée (DRAFT) : ${created.title}`);
    }

    console.log('');
    console.log(`Terminé : ${meetings} réunion(s) + ${missions} mission(s) en attente de validation coordinateur.`);
    console.log(`Elles apparaissent dans « À valider » pour ${project.coordinator?.name} (coordinateur du projet ${project.name}).`);
    if (SEND_EMAILS) {
        console.log(`Un e-mail « étape 1/2 » a été envoyé au coordinateur pour chaque item.`);
    }
}

main()
    .catch((e) => { console.error('✗ Échec du seed :', e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
