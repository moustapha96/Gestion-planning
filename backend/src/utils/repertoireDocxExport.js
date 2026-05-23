const path = require('path');
const fs = require('fs');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
    Header, Footer, PageNumber, ImageRun,
} = require('docx');

function buildRepertoireSearchWhere(search) {
    const q = String(search || '').trim();
    if (!q) return {};
    return {
        OR: [
            { prenomNom: { contains: q, mode: 'insensitive' } },
            { fonction: { contains: q, mode: 'insensitive' } },
            { directionLabel: { contains: q, mode: 'insensitive' } },
            { portable: { contains: q, mode: 'insensitive' } },
            { poste: { contains: q, mode: 'insensitive' } },
            { directe: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
        ],
    };
}

async function fetchRepertoireContacts(prisma, { search } = {}) {
    return prisma.repertoireContact.findMany({
        where: buildRepertoireSearchWhere(search),
        orderBy: [{ directionLabel: 'asc' }, { ordre: 'asc' }, { numero: 'asc' }],
    });
}

async function buildRepertoireDocxBuffer(contacts) {
    const groups = {};
    for (const c of contacts) {
        const label = c.directionLabel || '(Sans direction)';
        if (!groups[label]) groups[label] = [];
        groups[label].push(c);
    }

    const ADM_BLUE = '3e7cbc';
    const ADM_DARK = '0A2744';
    const WHITE = 'FFFFFF';
    const LBLUE = 'E8F0F9';
    const FONT = 'Calibri';
    const B = { style: BorderStyle.SINGLE, size: 4, color: '9EC6E0' };
    const BH = { style: BorderStyle.SINGLE, size: 6, color: ADM_DARK };
    const BORDERS = { top: B, bottom: B, left: B, right: B };
    const BHDRS = { top: BH, bottom: BH, left: BH, right: BH };
    const COLS = [600, 2400, 2800, 1600, 1450, 1450, 2600];

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
                    top: { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
                    bottom: { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
                    left: { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
                    right: { style: BorderStyle.SINGLE, size: 8, color: ADM_BLUE },
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
            hCell('N°', COLS[0]),
            hCell('Prénoms et Nom', COLS[1]),
            hCell('Fonction', COLS[2]),
            hCell('Poste', COLS[3]),
            hCell('Directe', COLS[4]),
            hCell('Portable', COLS[5]),
            hCell('E-mail', COLS[6]),
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
                    dCell(c.fonction || '', COLS[2], even),
                    dCell(c.poste || '', COLS[3], even, true),
                    dCell(c.directe || '', COLS[4], even, true),
                    dCell(c.portable || '', COLS[5], even, true),
                    dCell(c.email || '', COLS[6], even),
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
                                type: 'png',
                                data: logoData,
                                transformation: { width: 50, height: 50 },
                                altText: { title: 'ADM', description: 'Logo ADM', name: 'ADM Logo' },
                            })] : []),
                            new TextRun({
                                text: '  AGENCE DE DEVELOPPEMENT MUNICIPAL (ADM) — 2026',
                                font: FONT,
                                size: 22,
                                bold: true,
                                color: ADM_DARK,
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
                            new TextRun({
                                text: 'REPERTOIRE TELEPHONES — PERSONNEL ADM  |  Page ',
                                font: FONT,
                                size: 16,
                                color: '555555',
                            }),
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
                        font: FONT,
                        size: 28,
                        bold: true,
                        color: ADM_DARK,
                    })],
                }),
                new Table({ width: { size: totalW, type: WidthType.DXA }, columnWidths: COLS, rows }),
            ],
        }],
    });

    return Packer.toBuffer(doc);
}

module.exports = {
    buildRepertoireSearchWhere,
    fetchRepertoireContacts,
    buildRepertoireDocxBuffer,
};
