const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create admin user
    const admin = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@example.com',
            passwordHash: await bcrypt.hash('Admin123!', 12),
            role: 'ADMIN',
            isActive: true
        }
    });

    // Create consolidator
    const consolidator = await prisma.user.create({
        data: {
            name: 'Mansour BOCOUM',
            email: 'mansour.bocoum@example.com',
            passwordHash: await bcrypt.hash('Consolidateur123!', 12),
            role: 'CONSOLIDATEUR',
            isActive: true
        }
    });

    // Create DG
    const dg = await prisma.user.create({
        data: {
            name: 'Directeur General',
            email: 'dg@example.com',
            passwordHash: await bcrypt.hash('DG123!', 12),
            role: 'DG',
            isActive: true
        }
    });

    // Create test users
    const users = [];
    for (let i = 1; i <= 5; i++) {
        const user = await prisma.user.create({
            data: {
                name: `Responsable ${i}`,
                email: `responsable${i}@example.com`,
                passwordHash: await bcrypt.hash('User123!', 12),
                role: 'RESPONSABLE',
                isActive: true
            }
        });
        users.push(user);
    }

    // Create rooms
    const rooms = [];
    const roomNames = ['Salle Réunion A', 'Salle Réunion B', 'Salle Conférence', 'Salle Boardroom', 'Salle Formation'];

    for (const name of roomNames) {
        const room = await prisma.room.create({
            data: {
                name,
                capacity: 20,
                location: 'Etage 3, Bâtiment A',
                equipment: JSON.stringify(['projecteur', 'ecran', 'tableau', 'wifi']),
                openFrom: '08:00',
                openTo: '19:00',
                status: 'ACTIVE'
            }
        });
        rooms.push(room);
    }

    console.log('✅ Database seeded successfully!');
    console.log(`✅ Created ${users.length + 3} users, ${rooms.length} rooms`);
    console.log('\nTest credentials:');
    console.log('Admin: admin@example.com / Admin123!');
    console.log('Consolidator: mansour.bocoum@example.com / Consolidateur123!');
    console.log('DG: dg@example.com / DG123!');
    console.log(`Responsable: responsable1@example.com / User123! (etc.)`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async() => {
        await prisma.$disconnect();
    });