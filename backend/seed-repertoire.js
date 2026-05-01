/**
 * Seed : Directions organisationnelles + Répertoire téléphonique ADM
 * Usage : node seed-repertoire.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Directions à créer (upsert par name) ─────────────────────────────────────
const DIRECTIONS = [
  { name: 'DIRECTION GENERALE',                  code: 'DG',     description: 'Direction Générale de l\'ADM' },
  { name: 'SECRETARIAT GENERAL',                 code: 'SG',     description: 'Secrétariat Général' },
  { name: 'DIRECTION DEVELOPPEMENT, PARTENARIAT ET FINANCEMENT INNOVENTS',
                                                  code: 'DDPFI',  description: 'Direction Développement, Partenariat et Financement Innovants' },
  { name: 'CELLULE SUIVI EVALUATION',            code: 'CSE',    description: 'Cellule Suivi-Évaluation' },
  { name: 'CELLULE PASSATION DE MARCHES',        code: 'CPM',    description: 'Cellule Passation des Marchés' },
  { name: 'CELLULE COMMUNICATION',               code: 'CCOM',   description: 'Cellule Communication' },
  { name: 'DIRECTION ADMINISTRATIVE & FINANCIERE', code: 'DAF',  description: 'Direction Administrative et Financière' },
  { name: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES',
                                                  code: 'DRCIDC', description: 'Direction du Renforcement des Capacités Institutionnelles et du Développement des Compétences' },
  { name: 'DIRECTION TECHNIQUE',                 code: 'DT',     description: 'Direction Technique' },
  { name: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', code: 'CGES', description: 'Cellule Gestion Environnementale et Sociale' },
];

// ── Contacts (toutes les 64 entrées) ─────────────────────────────────────────
const CONTACTS = [
  // ── DIRECTION GENERALE ──────────────────────────────────────────────────────
  { numero: 1,  prenomNom: 'Mamouth DIOP',              fonction: 'Directeur Général',                                         directionLabel: 'DIRECTION GENERALE',          poste: '131', directe: null,           portable: '77 499 95 51', ordre: 1  },
  { numero: 2,  prenomNom: 'Mame Diarra B DIOP',        fonction: 'Secrétaire de Direction',                                   directionLabel: 'DIRECTION GENERALE',          poste: '142', directe: '33 849 17 43', portable: '77 802 69 61', ordre: 2  },
  // ── SECRETARIAT GENERAL ─────────────────────────────────────────────────────
  { numero: 3,  prenomNom: 'Papa Sambaré NDIAYE',       fonction: 'Secrétaire Général',                                        directionLabel: 'SECRETARIAT GENERAL',         poste: '104', directe: null,           portable: '77 333 87 33', ordre: 3  },
  { numero: 4,  prenomNom: 'SP SG',                     fonction: 'Secrétaire de Direction',                                   directionLabel: 'SECRETARIAT GENERAL',         poste: '105', directe: null,           portable: null,           ordre: 4  },
  // ── DDPFI ───────────────────────────────────────────────────────────────────
  { numero: 5,  prenomNom: 'Ndeye Ngoné SY',            fonction: 'DDPFI',                                                     directionLabel: 'DIRECTION DEVELOPPEMENT, PARTENARIAT ET FINANCEMENT INNOVENTS', poste: '149', directe: '33 849 17 41', portable: '77 529 33 34', ordre: 5  },
  // ── CELLULE SUIVI EVALUATION ────────────────────────────────────────────────
  { numero: 6,  prenomNom: 'Mansour BOCOUM',            fonction: 'Responsable Cellule Suivi-Evaluation / Coordonnateur PACASEN', directionLabel: 'CELLULE SUIVI EVALUATION', poste: '116', directe: null,           portable: '77 450 44 71', ordre: 6  },
  { numero: 7,  prenomNom: 'Mamadou Daha Kane',         fonction: 'Spécialiste en Suivi-Evaluation SERPP / PROGEP 2',          directionLabel: 'CELLULE SUIVI EVALUATION',    poste: '144', directe: null,           portable: '78 183 25 51', ordre: 7  },
  { numero: 8,  prenomNom: 'Yakhya CISSE',              fonction: 'Expert en Suivi-Evaluation PACASEN',                        directionLabel: 'CELLULE SUIVI EVALUATION',    poste: '121', directe: null,           portable: '78 183 25 67', ordre: 8  },
  // ── CELLULE PASSATION DE MARCHES ────────────────────────────────────────────
  { numero: 9,  prenomNom: 'Moussa FALL',               fonction: 'SPM / Resp. Cellule Passation des Marchés',                 directionLabel: 'CELLULE PASSATION DE MARCHES', poste: '120', directe: '33 849 27 15', portable: '77 742 39 73', ordre: 9  },
  { numero: 10, prenomNom: 'Ousmane Jean Baptiste DIOP',fonction: 'Spécialiste en Passation des Marchés SERRP / PROGEP 2',    directionLabel: 'CELLULE PASSATION DE MARCHES', poste: '119', directe: null,           portable: '77 740 78 52', ordre: 10 },
  { numero: 11, prenomNom: 'Cheikh Sidate DIOP',        fonction: 'Assistant en Passation des Marchés',                        directionLabel: 'CELLULE PASSATION DE MARCHES', poste: '161', directe: null,           portable: '78 639 02 01', ordre: 11 },
  // ── CELLULE COMMUNICATION ───────────────────────────────────────────────────
  { numero: 12, prenomNom: 'El Hadji Alassane DIALLO',  fonction: 'Chargé de la Communication / Responsable Cellule COM',     directionLabel: 'CELLULE COMMUNICATION',       poste: '114', directe: '33 849 17 68', portable: '78 638 29 19', ordre: 12 },
  { numero: 13, prenomNom: 'Amy Collé SENE',            fonction: 'Chargée du Multimédia',                                     directionLabel: 'CELLULE COMMUNICATION',       poste: '138', directe: null,           portable: '78 620 00 92', ordre: 13 },
  { numero: 14, prenomNom: 'Ousseynou TOURE',           fonction: 'Conseiller Technique',                                      directionLabel: 'CELLULE COMMUNICATION',       poste: null,  directe: null,           portable: '77 545 46 06', ordre: 14 },
  // ── DIRECTION ADMINISTRATIVE & FINANCIERE ───────────────────────────────────
  { numero: 15, prenomNom: 'Idrissa CAMARA',            fonction: 'Directeur Adm. & Financier',                                directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '135', directe: '33 849 27 11', portable: '77 450 44 72', ordre: 15 },
  { numero: 16, prenomNom: 'Kadia GADIAGA',             fonction: 'Assistante de Programme / SP DAF',                          directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '140', directe: '33 849 17 45', portable: '78 162 17 02', ordre: 16 },
  { numero: 17, prenomNom: 'Amadou Gallo SARR',         fonction: 'Chargé de Projets Financiers',                              directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '150', directe: '33 849 17 46', portable: '77 529 33 35', ordre: 17 },
  { numero: 18, prenomNom: 'Ndèye Aïssatou FAYE',       fonction: 'Assistante Administrative',                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '151', directe: '33 849 17 69', portable: '77 333 95 40', ordre: 18 },
  { numero: 19, prenomNom: 'Mame Toga NGOM',            fonction: 'Responsable RH',                                            directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '145', directe: null,           portable: '77 740 83 90', ordre: 19 },
  { numero: 20, prenomNom: 'Oumou M FALL',              fonction: 'Assistante Administrative',                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '139', directe: null,           portable: '78 462 17 84', ordre: 20 },
  { numero: 21, prenomNom: 'Cheikh Saadbou SEYE',       fonction: 'Comptable PROGEP / SERRP',                                  directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '129', directe: null,           portable: '77 272 72 10', ordre: 21 },
  { numero: 22, prenomNom: 'Diégui BA',                 fonction: 'Assistant Administrative',                                  directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '141', directe: null,           portable: '78 180 94 98', ordre: 22 },
  { numero: 23, prenomNom: 'Insa DIOP',                 fonction: 'Chef Comptable',                                            directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '132', directe: null,           portable: '77 277 23 24', ordre: 23 },
  { numero: 24, prenomNom: 'Aminata SOW',               fonction: 'Comptable',                                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '128', directe: null,           portable: '77 403 81 21', ordre: 24 },
  { numero: 25, prenomNom: 'Bintou NDAO',               fonction: 'Assistante Comptable',                                      directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '167', directe: null,           portable: '78 140 95 09', ordre: 25 },
  { numero: 26, prenomNom: 'Saliou SENE',               fonction: 'Réceptionniste',                                            directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '160', directe: null,           portable: '77 529 33 41', ordre: 26 },
  { numero: 27, prenomNom: 'Moustapha SAKHO',           fonction: 'Chauffeur DG',                                              directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '160', directe: null,           portable: '77 802 72 64', ordre: 27 },
  { numero: 28, prenomNom: 'Oumar NIANG',               fonction: 'Chauffeur',                                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '160', directe: null,           portable: '78 638 02 04', ordre: 28 },
  { numero: 29, prenomNom: 'Chérif SALL',               fonction: 'Chauffeur',                                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '160', directe: null,           portable: '78 639 07 92', ordre: 29 },
  { numero: 30, prenomNom: 'Abdoulaye LO',              fonction: 'Chauffeur',                                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '160', directe: null,           portable: '78 459 78 50', ordre: 30 },
  { numero: 31, prenomNom: 'Abdoulaye MANGASSA',        fonction: 'Chauffeur',                                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '160', directe: null,           portable: '78 183 26 47', ordre: 31 },
  { numero: 32, prenomNom: 'Marème Ndiaye',             fonction: 'Responsable Informatique',                                  directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '143', directe: '33 849 17 46', portable: '78 180 94 01', ordre: 32 },
  { numero: 33, prenomNom: 'El Hadji Amadou Lamine DIENE', fonction: 'Assistant Informatique',                                 directionLabel: 'DIRECTION ADMINISTRATIVE & FINANCIERE', poste: '143', directe: '33 849 17 46', portable: '77 356 02 50', ordre: 33 },
  // ── DRCIDC ──────────────────────────────────────────────────────────────────
  { numero: 34, prenomNom: 'Pierre Bernard Albert COLY',fonction: 'DRCIDC',                                                    directionLabel: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES', poste: '148', directe: '33 849 27 14', portable: '77 529 33 19', ordre: 34 },
  { numero: 35, prenomNom: 'Bintou DIENG',              fonction: 'Secrétaire de Direction',                                   directionLabel: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES', poste: '146', directe: '33 849 17 43', portable: '78 016 14 20', ordre: 35 },
  { numero: 36, prenomNom: 'Mamadou NDIAYE',            fonction: 'Chargé de Projets Financiers Senior / Coordonnateur CdM Ass', directionLabel: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES', poste: '158', directe: '33 849 17 86', portable: '77 529 33 26', ordre: 36 },
  { numero: 37, prenomNom: 'Diatta DIAGNE',             fonction: 'Chargé de Projets Financiers',                              directionLabel: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES', poste: '137', directe: null,           portable: '78 638 10 64', ordre: 37 },
  { numero: 38, prenomNom: 'Alboury GUEYE',             fonction: 'Assistant de Programme',                                    directionLabel: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES', poste: '154', directe: null,           portable: '78 639 02 03', ordre: 38 },
  { numero: 39, prenomNom: 'Papa Mamadou CISSE',        fonction: 'Assistant Technique / Facilitateur Sociale SERRP et PROGEP 2', directionLabel: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES', poste: '153', directe: '33 849 27 16', portable: '78 711 91 69', ordre: 39 },
  { numero: 40, prenomNom: 'Samba SENE',                fonction: 'Assistante de Programme',                                   directionLabel: 'DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES', poste: '141', directe: null,           portable: '78 162 16 29', ordre: 40 },
  // ── DIRECTION TECHNIQUE ─────────────────────────────────────────────────────
  { numero: 41, prenomNom: 'Lamine DOUMBOUYA',          fonction: 'Expert Hydraulicien / Coordonnateur SERRP',                 directionLabel: 'DIRECTION TECHNIQUE',         poste: '123', directe: '33 849 27 13', portable: '77 333 97 14', ordre: 41 },
  { numero: 42, prenomNom: 'Adji Awa Ly BA',            fonction: 'Secrétaire de Direction',                                   directionLabel: 'DIRECTION TECHNIQUE',         poste: '133', directe: '33 849 17 44', portable: '78 183 25 65', ordre: 42 },
  { numero: 43, prenomNom: 'Mamadou TALL',              fonction: 'Directeur Technique / Coordonnateur PROGEP2',               directionLabel: 'DIRECTION TECHNIQUE',         poste: '155', directe: '33 849 17 70', portable: '77 740 95 33', ordre: 43 },
  { numero: 44, prenomNom: 'Papa Aldiouma CISSE',       fonction: 'Chargé de Projets Techniques Senior / Coordonnateur ADEM 2', directionLabel: 'DIRECTION TECHNIQUE',        poste: '147', directe: null,           portable: '77 740 95 34', ordre: 44 },
  { numero: 45, prenomNom: 'Serigne Mbacké NDOYE',      fonction: 'Chargé de Projets Techniques Senior',                       directionLabel: 'DIRECTION TECHNIQUE',         poste: '162', directe: null,           portable: '78 638 10 62', ordre: 45 },
  { numero: 46, prenomNom: 'Amadou Diouldé DIALLO',     fonction: 'Expert Urbain SERRP / PROGEP 2',                            directionLabel: 'DIRECTION TECHNIQUE',         poste: '103', directe: null,           portable: '78 183 25 64', ordre: 46 },
  { numero: 47, prenomNom: 'Khady Manel FALL',          fonction: 'Assistante de Programme SERRP PROGEP 2',                    directionLabel: 'DIRECTION TECHNIQUE',         poste: '157', directe: '33 849 17 85', portable: '77 740 82 97', ordre: 47 },
  { numero: 48, prenomNom: 'Papa Alassane SARR',        fonction: 'Chargé de Projets Techniques',                              directionLabel: 'DIRECTION TECHNIQUE',         poste: '110', directe: null,           portable: '77 328 41 96', ordre: 48 },
  // ── CELLULE GESTION ENVIRONNEMENTALE & SOCIALE ──────────────────────────────
  { numero: 49, prenomNom: 'Awa NDIAYE',                fonction: 'Responsable Cellule GES',                                   directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: '152', directe: null,   portable: '78 183 25 84', ordre: 49 },
  { numero: 50, prenomNom: 'Marie Solange NDIONE',      fonction: 'Expert Social SERRP',                                       directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: '154', directe: null,   portable: '77 555 51 79', ordre: 50 },
  { numero: 51, prenomNom: 'Marie DIOH',                fonction: 'Expert en Intermédiation Sociale SERRP / PROGEP 2',         directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: 'SL',  directe: 'CGES', portable: '78 183 25 65', ordre: 51 },
  { numero: 52, prenomNom: 'Insa FALL',                 fonction: 'Expert en Sauvegarde Environnementale SERRP',               directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: 'SL',  directe: 'CGES', portable: '77 543 63 27', ordre: 52 },
  { numero: 53, prenomNom: 'Ousmane NDIAYE',            fonction: 'Expert Social SERRP',                                       directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: 'SL',  directe: null,   portable: '78 473 68 09', ordre: 53 },
  { numero: 54, prenomNom: 'Mandaw GUEYE',              fonction: 'Assistant à la coordination locale SERRP',                  directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: 'SL',  directe: null,   portable: '77 248 12 45', ordre: 54 },
  { numero: 55, prenomNom: 'Alphousseyni SANE',         fonction: 'Ingénieur Génie Civil SERRP',                               directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: 'SL',  directe: null,   portable: '77 556 86 79', ordre: 55 },
  { numero: 56, prenomNom: 'Ndiaté KANE',               fonction: 'Assistante de Programme',                                   directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: '159', directe: null,   portable: '78 183 25 56', ordre: 56 },
  { numero: 57, prenomNom: 'Abdoul ANNE',               fonction: 'Expert en Gouvernance Inst. et Financière PACASEN',         directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: null,  directe: null,   portable: '77 414 68 68', ordre: 57 },
  { numero: 58, prenomNom: 'Mouhamed SOW',              fonction: 'Expert Urbain PACASEN',                                     directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: null,  directe: null,   portable: '77 659 48 48', ordre: 58 },
  { numero: 59, prenomNom: 'Ndeye SAGNE',               fonction: 'Expert Social PACASEN',                                     directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: '117', directe: null,   portable: '77 203 39 81', ordre: 59 },
  { numero: 60, prenomNom: 'Moustapha Samb DIAYELA',    fonction: 'Expert Social PROGEP2',                                     directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: '102', directe: null,   portable: '77 114 26 12', ordre: 60 },
  { numero: 61, prenomNom: 'Saliou KAMARA',             fonction: 'Expert HSE PROGEP 2',                                       directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: null,  directe: null,   portable: '77 109 74 20', ordre: 61 },
  { numero: 62, prenomNom: 'Ndèye Aida BOYE',           fonction: 'Ingénieur Génie Civil PROGEP 2',                            directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: null,  directe: null,   portable: '77 108 99 51', ordre: 62 },
  { numero: 63, prenomNom: 'Ndèye Diariètou MBAYE',     fonction: 'Expert SIG / Base de données PROGEP 2',                    directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: null,  directe: null,   portable: '77 109 01 55', ordre: 63 },
  { numero: 64, prenomNom: 'Aly TOUNKARA',              fonction: 'Expert Hydraulicien de Conception PROGEP 2',                directionLabel: 'CELLULE GESTION ENVIRONNEMENTALE & SOCIALE', poste: 'KM',  directe: null,   portable: '78 109 73 28', ordre: 64 },
];

async function main() {
  console.log('🚀 Démarrage du seed répertoire ADM...\n');

  // ── 1. Directions ──────────────────────────────────────────────────────────
  console.log('📁 Création / mise à jour des directions...');
  let dirsCreated = 0;
  let dirsUpdated = 0;

  for (const dir of DIRECTIONS) {
    const existing = await prisma.direction.findFirst({ where: { name: dir.name } });
    if (existing) {
      await prisma.direction.update({
        where: { id: existing.id },
        data: { code: dir.code, description: dir.description, isActive: true },
      });
      console.log(`  ✓ Mise à jour  [${dir.code}]  ${dir.name}`);
      dirsUpdated++;
    } else {
      await prisma.direction.create({
        data: {
          name:        dir.name,
          code:        dir.code,
          description: dir.description,
          logoUrl:     '/adm_logo.png',
          isActive:    true,
        },
      });
      console.log(`  ✚ Créée        [${dir.code}]  ${dir.name}`);
      dirsCreated++;
    }
  }
  console.log(`\n  → ${dirsCreated} direction(s) créée(s), ${dirsUpdated} mise(s) à jour.\n`);

  // ── 2. Contacts ────────────────────────────────────────────────────────────
  console.log('👤 Import des contacts répertoire...');

  // Suppression des contacts existants pour repartir proprement
  const deleted = await prisma.repertoireContact.deleteMany({});
  console.log(`  ✗ ${deleted.count} contact(s) existant(s) supprimé(s).`);

  const created = await prisma.repertoireContact.createMany({
    data: CONTACTS.map((c) => ({
      numero:        c.numero,
      prenomNom:     c.prenomNom,
      fonction:      c.fonction   || null,
      directionLabel: c.directionLabel,
      poste:         c.poste      || null,
      directe:       c.directe    || null,
      portable:      c.portable   || null,
      ordre:         c.ordre,
    })),
  });
  console.log(`  ✚ ${created.count} contact(s) créé(s).\n`);

  // ── 3. Résumé ──────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('✅ Seed terminé avec succès !');
  console.log(`   Directions : ${DIRECTIONS.length}`);
  console.log(`   Contacts   : ${created.count}`);
  console.log('═'.repeat(60));
}

main()
  .catch((err) => {
    console.error('\n❌ Erreur lors du seed :', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
