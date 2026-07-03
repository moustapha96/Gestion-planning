/**
 * Créer ou mettre à jour un compte SUPER_ADMIN.
 *
 * Usage :
 *   node scripts/create-super-admin.js <email> <password> [nom]
 *
 * Exemple :
 *   node scripts/create-super-admin.js admin@admin.com "password123" "Admin GP"
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = String(process.argv[2] || '').trim();
    const password = process.argv[3];
    const name = String(process.argv[4] || 'Super Administrateur').trim();

    if (!email || !password) {
        console.error('Usage: node scripts/create-super-admin.js <email> <password> [nom]');
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, name: true, email: true, role: true, isDeleted: true },
    });

    if (existing) {
        const updated = await prisma.user.update({
            where: { id: existing.id },
            data: {
                name,
                email: email.toLowerCase(),
                passwordHash,
                role: 'SUPER_ADMIN',
                isActive: true,
                isDeleted: false,
            },
            select: { id: true, name: true, email: true, role: true },
        });
        console.log(`OK — compte mis à jour : ${updated.name} <${updated.email}> (${updated.role})`);
        return;
    }

    const created = await prisma.user.create({
        data: {
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: 'SUPER_ADMIN',
            isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
    });
    console.log(`OK — compte créé : ${created.name} <${created.email}> (${created.role})`);
}

main()
    .catch((e) => {
        console.error(e.message || e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
