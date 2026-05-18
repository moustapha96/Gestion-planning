/**
 * Crée ou met à jour les comptes « side » (un par rôle du workflow) + directions.
 *
 * Usage (depuis backend/) :
 *   npm run db:seed-side-accounts
 *   node prisma/seed-test-accounts.js
 *
 * Mot de passe : variable SIDE_ACCOUNTS_PASSWORD ou défaut ci-dessous.
 * Les comptes existants (même email) sont mis à jour, pas dupliqués.
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ── Comptes à créer ───────────────────────────────────────────────────────────

const PASSWORD = process.env.SIDE_ACCOUNTS_PASSWORD || 'Test@2026 !';

const ACCOUNTS = [
    {
        role:      'RESPONSABLE',
        email:     'resp.test@adm.sn',
        name:      'Amadou Diallo',
        direction: 'Dir. Technique',
    },
    {
        role:      'CONSOLIDATEUR',
        email:     'consol.test@adm.sn',
        name:      'Fatou Seck',
        direction: 'Dir. Générale',
    },
    {
        role:      'COORDINATEUR_PROJET',
        email:     'cp.test@adm.sn',
        name:      'Moussa Ndiaye',
        direction: 'Dir. Projets',
    },
    {
        role:      'SECRETAIRE_GENERAL',
        email:     'sg.test@adm.sn',
        name:      'Aïssatou Diop',
        direction: 'Dir. Générale',
    },
    {
        role:      'DG',
        email:     'dg.test@adm.sn',
        name:      'Ibrahima Fall',
        direction: 'Dir. Générale',
    },
    {
        role:      'ADMIN',
        email:     'admin.test@adm.sn',
        name:      'Cheikh Mbaye',
        direction: 'DSI',
    },
    {
        role:      'SUPER_ADMIN',
        email:     'superadmin@adm.sn',
        name:      'Admin Système',
        direction: 'DSI',
    },
];

// ── Utilitaires ───────────────────────────────────────────────────────────────

/** Retourne l'ID d'une direction existante ou la crée. */
async function upsertDirection(name) {
    const existing = await prisma.direction.findFirst({ where: { name } });
    if (existing) return existing.id;
    const created = await prisma.direction.create({ data: { name, isActive: true } });
    console.log(`  ✚ Direction créée : ${name}`);
    return created.id;
}

/** Crée ou met à jour un compte utilisateur. */
async function upsertUser(account, passwordHash, directionId) {
    const { email, name, role } = account;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        await prisma.user.update({
            where: { email },
            data: {
                name,
                role,
                passwordHash,
                directionId,
                isActive:  true,
                isDeleted: false,
            },
        });
        console.log(`  ↻ Mis à jour  : [${role.padEnd(20)}] ${name} <${email}>`);
    } else {
        await prisma.user.create({
            data: {
                email,
                name,
                role,
                passwordHash,
                directionId,
                isActive:  true,
                isDeleted: false,
            },
        });
        console.log(`  ✚ Créé        : [${role.padEnd(20)}] ${name} <${email}>`);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║        ADM GP — Création des comptes de test         ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    console.log(`Hachage du mot de passe commun (bcrypt, 12 rounds)…`);
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    console.log('  ✔ Mot de passe haché\n');

    // Pré-charger / créer les directions nécessaires
    console.log('Directions :');
    const directionNames = [...new Set(ACCOUNTS.map((a) => a.direction))];
    const directionMap   = {};
    for (const name of directionNames) {
        directionMap[name] = await upsertDirection(name);
    }

    console.log('\nComptes :');
    for (const account of ACCOUNTS) {
        const directionId = directionMap[account.direction];
        await upsertUser(account, passwordHash, directionId);
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║                   Récapitulatif                      ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  Mot de passe commun : ${PASSWORD.padEnd(28)}║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    for (const a of ACCOUNTS) {
        const line = `${a.email} (${a.role})`;
        console.log(`║  ${line.padEnd(51)}║`);
    }
    console.log('╚══════════════════════════════════════════════════════╝\n');
}

main()
    .catch((e) => {
        console.error('\n❌ Erreur :', e.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
