/**
 * Promouvoir un utilisateur existant en Super administrateur.
 *
 * Usage :
 *   node scripts/promote-super-admin.js <email>
 *   set SUPER_ADMIN_EMAIL=xxx && node scripts/promote-super-admin.js
 *
 * Prérequis : fichier .env avec DATABASE_URL (dossier backend).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const raw = process.argv[2] || process.env.SUPER_ADMIN_EMAIL;
    if (!raw || !String(raw).trim()) {
        console.error('Usage: node scripts/promote-super-admin.js <email>');
        console.error('Exemple: node scripts/promote-super-admin.js admin@example.com');
        process.exit(1);
    }
    const email = String(raw).trim();

    const user = await prisma.user.findFirst({
        where: {
            email: { equals: email, mode: 'insensitive' },
            isDeleted: false,
        },
        select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) {
        console.error(`Aucun utilisateur actif trouvé avec l'email : ${email}`);
        process.exit(1);
    }

    if (user.role === 'SUPER_ADMIN') {
        console.log(`Déjà super administrateur : ${user.name} <${user.email}>`);
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' },
    });

    console.log(`OK — ${user.name} <${user.email}> est maintenant SUPER_ADMIN (était ${user.role}).`);
}

main()
    .catch((e) => {
        console.error(e.message || e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
