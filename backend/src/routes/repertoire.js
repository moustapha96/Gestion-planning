const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const { logger } = require('../utils/logger');
const { notificationService } = require('../services/notification.service');
const { createAuditLog } = require('../utils/audit');
const {
  ROLES, isValidRole, ADMIN_ROUTE_ROLES, isSuperAdmin,
} = require('../config/roles');
const { validatePasswordStrength } = require('../utils/passwordUtils');
const { syncDirectionDiscussionMembers } = require('../services/directionDiscussion.service');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  Header, Footer, PageNumber, ImageRun,
} = require('docx');
const path = require('path');
const fs   = require('fs');

const DELETE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DG'];
const EDIT_ROLES   = ['ADMIN', 'SUPER_ADMIN', 'DG', 'CONSOLIDATEUR'];

const MAX_USER_PHONE = 40;
const MAX_USER_JOB_TITLE = 120;
const MAX_USER_CELL_UNIT = 120;

function clipRepertoireUserText(v, maxLen) {
  if (v === undefined || v === null || v === '') return null;
  const t = String(v).trim();
  return t ? t.slice(0, maxLen) : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseOptionalEmail(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (!EMAIL_RE.test(s)) return { invalid: true };
  return s;
}

// ── GET /api/repertoire — liste des contacts ──────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, direction } = req.query;
    const prisma = req.prisma;

    const where = {};
    if (search) {
      where.OR = [
        { prenomNom:      { contains: search, mode: 'insensitive' } },
        { fonction:       { contains: search, mode: 'insensitive' } },
        { directionLabel: { contains: search, mode: 'insensitive' } },
        { portable:       { contains: search, mode: 'insensitive' } },
        { poste:          { contains: search, mode: 'insensitive' } },
        { email:          { contains: search, mode: 'insensitive' } },
      ];
    }
    if (direction) {
      where.directionLabel = { contains: direction, mode: 'insensitive' };
    }

    const contacts = await prisma.repertoireContact.findMany({
      where,
      orderBy: [{ directionLabel: 'asc' }, { ordre: 'asc' }, { numero: 'asc' }],
    });

    res.json(contacts);
  } catch (err) {
    logger.error('GET /repertoire error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/repertoire/directions — directions organisationnelles actives ────
// Retourne les Direction du modèle organisationnel (pas les labels libres)
router.get('/directions', authMiddleware, async (req, res) => {
  try {
    const prisma = req.prisma;
    const dirs = await prisma.direction.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, logoUrl: true },
      orderBy: { name: 'asc' },
    });
    res.json(dirs);
  } catch (err) {
    logger.error('GET /repertoire/directions error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/repertoire — créer un contact ───────────────────────────────────
router.post('/', authMiddleware, roleMiddleware(EDIT_ROLES), async (req, res) => {
  try {
    const { numero, prenomNom, fonction, poste, directe, portable, email, directionLabel, ordre } = req.body;
    if (!prenomNom)      return res.status(400).json({ error: 'prenomNom requis' });
    if (!directionLabel) return res.status(400).json({ error: 'directionLabel requis' });

    const emailNorm = parseOptionalEmail(email);
    if (emailNorm && typeof emailNorm === 'object' && emailNorm.invalid) {
      return res.status(400).json({ error: 'Format email invalide' });
    }

    const prisma = req.prisma;
    const contact = await prisma.repertoireContact.create({
      data: {
        numero:         numero ? parseInt(numero) : 0,
        prenomNom,
        fonction:       fonction || null,
        poste:          poste    || null,
        directe:        directe  || null,
        portable:       portable || null,
        email:          emailNorm === undefined ? null : emailNorm,
        directionLabel: directionLabel.trim(),
        ordre:          ordre ? parseInt(ordre) : 0,
      },
    });

    logger.info('Répertoire contact créé', { id: contact.id, by: req.user?.id });
    res.status(201).json(contact);
  } catch (err) {
    logger.error('POST /repertoire error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/repertoire/:id/create-account — créer un compte app (ADMIN) ─────
router.post(
  '/:id/create-account',
  authMiddleware,
  roleMiddleware(ADMIN_ROUTE_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { password, role: roleRaw } = req.body || {};
      let role = roleRaw || ROLES.RESPONSABLE;
      if (!isValidRole(role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }
      if (role === ROLES.SUPER_ADMIN) {
        const superCount = await req.prisma.user.count({
          where: { role: ROLES.SUPER_ADMIN, isDeleted: false },
        });
        const allowBootstrap = req.user.role === ROLES.ADMIN && superCount === 0;
        if (!isSuperAdmin(req.user.role) && !allowBootstrap) {
          return res.status(403).json({
            error: 'Seul un super administrateur peut attribuer le rôle Super administrateur.',
          });
        }
      }

      const pwdErr = validatePasswordStrength(password);
      if (pwdErr) return res.status(400).json({ error: pwdErr });

      const contact = await req.prisma.repertoireContact.findUnique({ where: { id } });
      if (!contact) return res.status(404).json({ error: 'Contact non trouvé' });

      const emailRaw = String(contact.email || '').trim();
      if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
        return res.status(400).json({
          error: 'Ce contact n\'a pas d\'adresse e-mail valide. Complétez la fiche répertoire d\'abord.',
        });
      }
      const email = emailRaw.toLowerCase();

      const existingUser = await req.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existingUser) {
        return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' });
      }

      const name = String(contact.prenomNom || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Nom du contact manquant sur la ligne répertoire.' });
      }

      let directionId = null;
      const label = String(contact.directionLabel || '').trim();
      if (label) {
        const dir = await req.prisma.direction.findFirst({
          where: { isActive: true, name: { equals: label, mode: 'insensitive' } },
          select: { id: true },
        });
        directionId = dir?.id || null;
      }

      const phoneRaw = [contact.portable, contact.directe].find((x) => x && String(x).trim());
      const phone = clipRepertoireUserText(phoneRaw, MAX_USER_PHONE);
      const jobTitle = clipRepertoireUserText(contact.fonction, MAX_USER_JOB_TITLE);
      const cellUnit = clipRepertoireUserText(
        contact.poste ? `Poste ${contact.poste}` : null,
        MAX_USER_CELL_UNIT,
      );

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await req.prisma.user.create({
        data: {
          name,
          email,
          role,
          passwordHash: hashedPassword,
          isActive: false,
          directionId,
          projectId: null,
          phone,
          jobTitle,
          cellUnit,
        },
      });

      if (user.directionId) {
        await syncDirectionDiscussionMembers(req.prisma, user.directionId);
      }

      logger.info('USER_CREATED_FROM_REPERTOIRE', {
        userId: user.id,
        repertoireContactId: id,
        by: req.user?.id,
      });
      await createAuditLog(
        req,
        'CREATE_USER',
        'User',
        user.id,
        `Compte créé depuis le répertoire (${email})`,
      );

      const activationToken = jwt.sign(
        { id: user.id, purpose: 'account_activation' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACTIVATION_EXPIRY || '7d' },
      );
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const activationUrl = `${frontendUrl}/activate-account?token=${encodeURIComponent(activationToken)}`;

      await notificationService.sendEmail(email, 'ACCOUNT_ACTIVATION', [user, activationUrl, password]);

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        directionId: user.directionId,
        directionLinked: Boolean(directionId),
      });
    } catch (err) {
      logger.error('POST /repertoire/:id/create-account', { error: err.message });
      res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
  },
);

// ── PUT /api/repertoire/:id — modifier un contact ─────────────────────────────
router.put('/:id', authMiddleware, roleMiddleware(EDIT_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, prenomNom, fonction, poste, directe, portable, email, directionLabel, ordre } = req.body;
    const prisma = req.prisma;

    const data = {};
    if (numero         !== undefined) data.numero         = parseInt(numero);
    if (prenomNom      !== undefined) data.prenomNom      = prenomNom;
    if (fonction       !== undefined) data.fonction       = fonction;
    if (poste          !== undefined) data.poste          = poste;
    if (directe        !== undefined) data.directe        = directe;
    if (portable       !== undefined) data.portable       = portable;
    if (email          !== undefined) {
      const emailNorm = parseOptionalEmail(email);
      if (emailNorm && typeof emailNorm === 'object' && emailNorm.invalid) {
        return res.status(400).json({ error: 'Format email invalide' });
      }
      data.email = emailNorm === undefined ? null : emailNorm;
    }
    if (directionLabel !== undefined) data.directionLabel = directionLabel.trim();
    if (ordre          !== undefined) data.ordre          = parseInt(ordre);

    const contact = await prisma.repertoireContact.update({
      where: { id },
      data,
    });

    logger.info('Répertoire contact modifié', { id, by: req.user?.id });
    res.json(contact);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Contact non trouvé' });
    logger.error('PUT /repertoire/:id error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE /api/repertoire/:id ────────────────────────────────────────────────
router.delete('/:id', authMiddleware, roleMiddleware(DELETE_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = req.prisma;
    await prisma.repertoireContact.delete({ where: { id } });
    logger.info('Répertoire contact supprimé', { id, by: req.user?.id });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Contact non trouvé' });
    logger.error('DELETE /repertoire/:id error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/repertoire/export/docx ──────────────────────────────────────────
router.get('/export/docx', authMiddleware, async (req, res) => {
  try {
    const prisma = req.prisma;
    const contacts = await prisma.repertoireContact.findMany({
      orderBy: [{ directionLabel: 'asc' }, { ordre: 'asc' }, { numero: 'asc' }],
    });

    // Grouper par direction
    const groups = {};
    for (const c of contacts) {
      const label = c.directionLabel || '(Sans direction)';
      if (!groups[label]) groups[label] = [];
      groups[label].push(c);
    }

    const ADM_BLUE = '3e7cbc';
    const ADM_DARK = '0A2744';
    const WHITE    = 'FFFFFF';
    const LBLUE    = 'E8F0F9';
    const FONT     = 'Calibri';
    const B  = { style: BorderStyle.SINGLE, size: 4, color: '9EC6E0' };
    const BH = { style: BorderStyle.SINGLE, size: 6, color: ADM_DARK };
    const BORDERS = { top: B,  bottom: B,  left: B,  right: B  };
    const BHDRS   = { top: BH, bottom: BH, left: BH, right: BH };
    const COLS    = [600, 2400, 2800, 1600, 1450, 1450, 2600];

    function hCell(text, w) {
      return new TableCell({
        borders: BHDRS,
        width: { size: w, type: WidthType.DXA },
        shading: { fill: ADM_DARK, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, font: FONT, size: 18, bold: true, color: WHITE })],
        })],
      });
    }

    function dCell(text, w, even, center = false) {
      return new TableCell({
        borders: BORDERS,
        width: { size: w, type: WidthType.DXA },
        shading: { fill: even ? LBLUE : WHITE, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: text || '', font: FONT, size: 18, color: '1A1A1A' })],
        })],
      });
    }

    function groupHeaderRow(label) {
      const totalW = COLS.reduce((a, b) => a + b, 0);
      return new TableRow({
        children: [new TableCell({
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
            left:   { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
            right:  { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
          },
          width: { size: totalW, type: WidthType.DXA },
          columnSpan: 7,
          shading: { fill: ADM_BLUE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 200, right: 200 },
          children: [new Paragraph({
            children: [new TextRun({ text: label.toUpperCase(), font: FONT, size: 20, bold: true, color: WHITE })],
          })],
        })],
      });
    }

    const logoPath = path.join(__dirname, '../../../frontend/public/adm_logo.png');
    let logoData = null;
    try { logoData = fs.readFileSync(logoPath); } catch { /* logo absent */ }

    const rows = [];
    rows.push(new TableRow({
      tableHeader: true,
      children: [
        hCell('N°',             COLS[0]),
        hCell('Prénoms et Nom', COLS[1]),
        hCell('Fonction',       COLS[2]),
        hCell('Poste',          COLS[3]),
        hCell('Directe',        COLS[4]),
        hCell('Portable',       COLS[5]),
        hCell('E-mail',         COLS[6]),
      ],
    }));

    let rowIdx = 0;
    for (const [label, members] of Object.entries(groups)) {
      rows.push(groupHeaderRow(label));
      for (const c of members) {
        const even = rowIdx % 2 === 1;
        rows.push(new TableRow({
          children: [
            dCell(c.numero ? String(c.numero).padStart(2, '0') : '', COLS[0], even, true),
            dCell(c.prenomNom || '', COLS[1], even),
            dCell(c.fonction  || '', COLS[2], even),
            dCell(c.poste     || '', COLS[3], even, true),
            dCell(c.directe   || '', COLS[4], even, true),
            dCell(c.portable  || '', COLS[5], even, true),
            dCell(c.email     || '', COLS[6], even),
          ],
        }));
        rowIdx++;
      }
    }

    const totalW = COLS.reduce((a, b) => a + b, 0);
    const doc = new Document({
      styles: { default: { document: { run: { font: FONT, size: 20 } } } },
      sections: [{
        properties: {
          page: {
            size: { width: 16838, height: 11906 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 100 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ADM_BLUE, space: 1 } },
              children: [
                ...(logoData ? [new ImageRun({
                  type: 'png', data: logoData,
                  transformation: { width: 50, height: 50 },
                  altText: { title: 'ADM', description: 'Logo ADM', name: 'ADM Logo' },
                })] : []),
                new TextRun({
                  text: '  AGENCE DE DEVELOPPEMENT MUNICIPAL (ADM) — 2026',
                  font: FONT, size: 22, bold: true, color: ADM_DARK,
                }),
              ],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: ADM_BLUE, space: 1 } },
              children: [
                new TextRun({ text: 'REPERTOIRE TELEPHONES — PERSONNEL ADM  |  Page ', font: FONT, size: 16, color: '555555' }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '555555' }),
              ],
            })],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [new TextRun({
              text: 'REPERTOIRE TELEPHONES — PERSONNEL ADM',
              font: FONT, size: 28, bold: true, color: ADM_DARK,
            })],
          }),
          new Table({ width: { size: totalW, type: WidthType.DXA }, columnWidths: COLS, rows }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="Repertoire_ADM_2026.docx"');
    res.send(buffer);
  } catch (err) {
    logger.error('GET /repertoire/export/docx error', { error: err.message });
    res.status(500).json({ error: 'Erreur génération DOCX' });
  }
});

module.exports = router;
