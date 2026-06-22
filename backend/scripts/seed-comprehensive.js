/**
 * Seed complet de démonstration
 * Crée 3 de chaque : directions, postes, utilisateurs par rôle, salles, missions, réunions, événements
 *
 * Usage :
 *   node scripts/seed-comprehensive.js
 *
 * Options (variables d'environnement) :
 *   SEED_CLEAR=1            Nettoie les données existantes avant le seed (défaut : 0)
 *   SEED_VERBOSE=1          Affiche plus de détails (défaut : 0)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CLEAR_DATA = process.env.SEED_CLEAR === '1';
const VERBOSE = process.env.SEED_VERBOSE === '1';

const ROLES = {
    RESPONSABLE: 'RESPONSABLE',
    CONSOLIDATEUR: 'CONSOLIDATEUR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
};

const JOB_TITLES = [
    'Chef de Projet',
    'Coordinateur',
    'Gestionnaire',
];

const DIRECTIONS_DATA = [
    { name: 'Direction IT', code: 'IT' },
    { name: 'Direction RH', code: 'RH' },
    { name: 'Direction Finance', code: 'FIN' },
];

const ROOMS_DATA = [
    { name: 'Salle Réunion A', capacity: 10, location: 'Étage 1', equipment: 'Vidéoprojecteur, Tableau blanc' },
    { name: 'Salle Réunion B', capacity: 8, location: 'Étage 2', equipment: 'Écran TV, Visioconférence' },
    { name: 'Salle Réunion C', capacity: 6, location: 'Étage 3', equipment: 'Tableau blanc' },
];

// Utilitaires
function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function plusDays(days, hour = 9, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d;
}

function generateEmail(prefix, index) {
    return `${prefix.toLowerCase()}.${index}@example.com`;
}

// ──────────────────────────────────────────
// Fonctions de création
// ──────────────────────────────────────────

async function createDirections() {
    console.log('📁 Création des directions...');
    const created = [];

    for (const dirData of DIRECTIONS_DATA) {
        try {
            const direction = await prisma.direction.create({
                data: {
                    name: dirData.name,
                    code: dirData.code,
                    description: `Direction ${dirData.name}`,
                    isActive: true,
                },
            });
            created.push(direction);
            if (VERBOSE) console.log(`  ✓ Direction créée : ${direction.name}`);
        } catch (err) {
            if (err.code === 'P2002') {
                console.log(`  ⚠ Direction existante : ${dirData.name}`);
                const existing = await prisma.direction.findFirst({
                    where: { OR: [{ name: dirData.name }, { code: dirData.code }] },
                });
                if (existing) created.push(existing);
            } else throw err;
        }
    }

    return created;
}

async function createRooms() {
    console.log('🚪 Création des salles...');
    const created = [];

    for (const roomData of ROOMS_DATA) {
        try {
            const room = await prisma.room.create({
                data: {
                    name: roomData.name,
                    capacity: roomData.capacity,
                    location: roomData.location,
                    equipment: roomData.equipment,
                    status: 'ACTIVE',
                },
            });
            created.push(room);
            if (VERBOSE) console.log(`  ✓ Salle créée : ${room.name}`);
        } catch (err) {
            if (err.code === 'P2002' && err.meta?.target?.includes('name')) {
                console.log(`  ⚠ Salle existante : ${roomData.name}`);
                const existing = await prisma.room.findUnique({
                    where: { name: roomData.name },
                });
                if (existing) created.push(existing);
            } else throw err;
        }
    }

    return created;
}

async function createUsers() {
    console.log('👥 Création des utilisateurs (3 par rôle)...');
    const created = [];
    const roleList = Object.values(ROLES);

    for (const role of roleList) {
        for (let i = 1; i <= 3; i++) {
            const email = generateEmail(`${role.toLowerCase()}-${i}`, 1);
            try {
                const user = await prisma.user.create({
                    data: {
                        name: `${role} ${i}`,
                        email,
                        passwordHash: hashPassword('password123'),
                        role,
                        isActive: true,
                        phone: `+33 1 23 45 ${String(67 + i).padStart(2, '0')}`,
                        jobTitle: JOB_TITLES[(i - 1) % JOB_TITLES.length],
                        cellUnit: `Unité ${i}`,
                    },
                });
                created.push(user);
                if (VERBOSE) console.log(`  ✓ Utilisateur créé : ${user.name} (${user.role})`);
            } catch (err) {
                if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
                    console.log(`  ⚠ Utilisateur existant : ${email}`);
                    const existing = await prisma.user.findUnique({ where: { email } });
                    if (existing) created.push(existing);
                } else throw err;
            }
        }
    }

    return created;
}

async function createMissions(users, directions, projects) {
    console.log('📋 Création des missions...');
    const created = [];

    for (let i = 1; i <= 3; i++) {
        const creator = users[Math.floor(Math.random() * users.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const project = projects.length > 0 ? projects[Math.floor(Math.random() * projects.length)] : null;

        try {
            const mission = await prisma.mission.create({
                data: {
                    title: `[DEMO] Mission #${i}`,
                    description: `Mission de démonstration #${i} pour tester le système.`,
                    location: `Site ${i}`,
                    startTime: plusDays(i + 7),
                    endTime: plusDays(i + 7, 11),
                    directionId: direction.id,
                    projectId: project?.id || null,
                    createdById: creator.id,
                    status: 'CONFIRMED',
                },
                include: {
                    createdBy: { select: { id: true, name: true } },
                    direction: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                },
            });
            created.push(mission);
            if (VERBOSE) console.log(`  ✓ Mission créée : ${mission.title}`);
        } catch (err) {
            console.error(`  ✗ Erreur mission #${i} :`, err.message);
        }
    }

    return created;
}

async function createMeetings(users, directions, rooms, projects) {
    console.log('📅 Création des réunions...');
    const created = [];

    for (let i = 1; i <= 3; i++) {
        const organizer = users[Math.floor(Math.random() * users.length)];
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const project = projects.length > 0 ? projects[Math.floor(Math.random() * projects.length)] : null;

        try {
            const meeting = await prisma.meeting.create({
                data: {
                    title: `[DEMO] Réunion #${i}`,
                    agenda: `Ordre du jour de la réunion de démonstration #${i}`,
                    organizerId: organizer.id,
                    roomId: room.id,
                    directionId: direction.id,
                    projectId: project?.id || null,
                    startTime: plusDays(i + 3, 10 + i),
                    endTime: plusDays(i + 3, 11 + i),
                    status: 'SCHEDULED',
                },
                include: {
                    organizer: { select: { id: true, name: true } },
                    room: { select: { id: true, name: true } },
                    direction: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                },
            });
            created.push(meeting);
            if (VERBOSE) console.log(`  ✓ Réunion créée : ${meeting.title}`);
        } catch (err) {
            console.error(`  ✗ Erreur réunion #${i} :`, err.message);
        }
    }

    return created;
}

async function createEventTypes() {
    console.log('📌 Création des types d\'événements...');
    const created = [];

    const eventTypesData = [
        { name: 'Réunion Interne', code: 'REUNION_INTERNE', color: '#1565C0' },
        { name: 'Réunion Client', code: 'REUNION_CLIENT', color: '#00897B' },
        { name: 'Formation', code: 'FORMATION', color: '#F57C00' },
    ];

    for (const etData of eventTypesData) {
        try {
            const et = await prisma.eventType.create({
                data: {
                    name: etData.name,
                    code: etData.code,
                    color: etData.color,
                    isActive: true,
                },
            });
            created.push(et);
            if (VERBOSE) console.log(`  ✓ Type d'événement créé : ${et.name}`);
        } catch (err) {
            if (err.code === 'P2002' && err.meta?.target?.includes('code')) {
                console.log(`  ⚠ Type d'événement existant : ${etData.code}`);
                const existing = await prisma.eventType.findUnique({
                    where: { code: etData.code },
                });
                if (existing) created.push(existing);
            } else throw err;
        }
    }

    return created;
}

async function createPlanningEvents(users, eventTypes) {
    console.log('📊 Création des événements de planning...');
    const created = [];

    for (let i = 1; i <= 3; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        try {
            // Créer ou obtenir le planning pour cette semaine
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (i > 0 ? 7 : 0));
            weekStart.setHours(0, 0, 0, 0);

            let planning = await prisma.planning.findUnique({
                where: { userId_weekStart: { userId: user.id, weekStart } },
            });

            if (!planning) {
                planning = await prisma.planning.create({
                    data: {
                        userId: user.id,
                        weekStart,
                        status: 'DRAFT',
                    },
                });
            }

            const pevent = await prisma.planningEvent.create({
                data: {
                    planningId: planning.id,
                    title: `[DEMO] Événement Planning #${i}`,
                    type: 'MEETING',
                    eventTypeId: eventType.id,
                    startTime: plusDays(i + 1, 9 + i),
                    endTime: plusDays(i + 1, 10 + i),
                    description: `Événement de démonstration #${i}`,
                },
            });
            created.push(pevent);
            if (VERBOSE) console.log(`  ✓ Événement de planning créé : ${pevent.title}`);
        } catch (err) {
            console.error(`  ✗ Erreur événement planning #${i} :`, err.message);
        }
    }

    return created;
}

async function clearData() {
    console.log('🗑️  Nettoyage des données existantes...');

    try {
        // Attention : ordre important due to foreign keys
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "PlanningEvent" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Planning" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "MissionAssignment" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "MissionFile" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Mission" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "MeetingMessage" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "MeetingFile" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "RoomBooking" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Invitation" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Meeting" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Room" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "EventType" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "DirectionMessage" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "DirectionDiscussionMember" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "DirectionDiscussion" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Direction" CASCADE');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');

        console.log('  ✓ Données nettoyées');
    } catch (err) {
        console.log('  ⚠ Nettoyage partiel (tables peuvent être vides) :', err.message);
    }
}

// ──────────────────────────────────────────
// Main
// ──────────────────────────────────────────

async function main() {
    try {
        console.log('\n🌱 Démarrage du seed complet...\n');

        if (CLEAR_DATA) {
            await clearData();
            console.log('');
        }

        // 1. Directions
        const directions = await createDirections();
        console.log(`  ✓ Total : ${directions.length} direction(s)\n`);

        // 2. Salles
        const rooms = await createRooms();
        console.log(`  ✓ Total : ${rooms.length} salle(s)\n`);

        // 3. Utilisateurs
        const users = await createUsers();
        console.log(`  ✓ Total : ${users.length} utilisateur(s)\n`);

        // 4. Types d'événements
        const eventTypes = await createEventTypes();
        console.log(`  ✓ Total : ${eventTypes.length} type(s) d'événement\n`);

        // 5. Projets (optionnel, peut être vide)
        const projects = await prisma.project.findMany({ take: 5 });
        if (projects.length === 0) {
            console.log('ℹ️  Aucun projet existant trouvé');
        } else if (VERBOSE) {
            console.log(`ℹ️  ${projects.length} projet(s) trouvé(s)`);
        }
        console.log('');

        // 6. Missions
        const missions = await createMissions(users, directions, projects);
        console.log(`  ✓ Total : ${missions.length} mission(s)\n`);

        // 7. Réunions
        const meetings = await createMeetings(users, directions, rooms, projects);
        console.log(`  ✓ Total : ${meetings.length} réunion(s)\n`);

        // 8. Événements de planning
        const planningEvents = await createPlanningEvents(users, eventTypes);
        console.log(`  ✓ Total : ${planningEvents.length} événement(s) de planning\n`);

        // Résumé
        console.log('✅ Seed complet terminé avec succès !\n');
        console.log('📊 Résumé :');
        console.log(`  • Directions         : ${directions.length}`);
        console.log(`  • Salles             : ${rooms.length}`);
        console.log(`  • Utilisateurs       : ${users.length} (${Object.keys(ROLES).length} rôles × 3)`);
        console.log(`  • Types d'événements : ${eventTypes.length}`);
        console.log(`  • Missions           : ${missions.length}`);
        console.log(`  • Réunions           : ${meetings.length}`);
        console.log(`  • Événements planning: ${planningEvents.length}`);
        console.log('');

        if (VERBOSE) {
            console.log('📧 Comptes de test créés :');
            const roleGroups = Object.values(ROLES);
            for (const role of roleGroups) {
                console.log(`  ${role}:`);
                for (let i = 1; i <= 3; i++) {
                    console.log(`    - ${generateEmail(`${role.toLowerCase()}-${i}`, 1)} / password123`);
        }
      }
      console.log('');
    }
    
  } catch (err) {
    console.error('✗ Erreur lors du seed :', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();