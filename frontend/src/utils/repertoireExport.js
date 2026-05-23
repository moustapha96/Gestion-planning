import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DEFAULT_FILENAME = 'Repertoire_ADM_2026';

/** Regroupe les contacts par libellé de direction (trié). */
export function groupRepertoireByDirection(contacts) {
    const groups = {};
    for (const c of contacts || []) {
        const label = c.directionLabel || '(Sans direction)';
        if (!groups[label]) groups[label] = [];
        groups[label].push(c);
    }
    return Object.entries(groups).sort(([a], [b]) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' }),
    );
}

/**
 * Export PDF du répertoire (même rendu que la page Répertoire admin).
 * @param {Array} contacts
 * @param {{ orgDirByName?: Record<string, { code?: string }>, filename?: string }} options
 */
export function exportRepertoirePdf(contacts, options = {}) {
    const { orgDirByName = {}, filename = DEFAULT_FILENAME } = options;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const img = new Image();
    img.src = '/adm_logo.png';

    const getOrgDir = (label) => {
        if (!label) return null;
        return orgDirByName[label.trim().toLowerCase()] || null;
    };

    const buildPdf = () => {
        doc.setFillColor(10, 39, 68);
        doc.rect(0, 0, 297, 18, 'F');
        try { doc.addImage(img, 'PNG', 4, 2, 14, 14); } catch { /* logo absent */ }
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('AGENCE DE DEVELOPPEMENT MUNICIPAL (ADM) — 2026', 22, 11);
        doc.setTextColor(10, 39, 68);
        doc.setFontSize(11);
        doc.text('RÉPERTOIRE TÉLÉPHONIQUE — PERSONNEL ADM', 297 / 2, 23, { align: 'center' });

        const tableBody = [];
        for (const [dir, members] of groupRepertoireByDirection(contacts)) {
            const orgDir = getOrgDir(dir);
            const header = orgDir?.code ? `${dir.toUpperCase()}  (${orgDir.code})` : dir.toUpperCase();
            tableBody.push([{
                content: header,
                colSpan: 7,
                styles: {
                    fillColor: [62, 124, 188],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                },
            }]);
            for (const c of members) {
                tableBody.push([
                    { content: c.numero ? String(c.numero).padStart(2, '0') : '', styles: { halign: 'center' } },
                    c.prenomNom || '',
                    c.fonction || '',
                    c.poste || '',
                    c.directe || '',
                    c.portable || '',
                    c.email || '',
                ]);
            }
        }

        autoTable(doc, {
            startY: 28,
            head: [['N°', 'Prénoms et Nom', 'Fonction', 'Poste', 'Directe', 'Portable', 'E-mail']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1.5, font: 'helvetica' },
            headStyles: {
                fillColor: [10, 39, 68],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 42 },
                2: { cellWidth: 52 },
                3: { cellWidth: 14, halign: 'center' },
                4: { cellWidth: 24, halign: 'center' },
                5: { cellWidth: 24, halign: 'center' },
                6: { cellWidth: 48 },
            },
            alternateRowStyles: { fillColor: [232, 240, 249] },
            margin: { top: 28, left: 5, right: 5 },
            didDrawPage: (data) => {
                doc.setFontSize(7);
                doc.setTextColor(120, 120, 120);
                doc.text(`Répertoire ADM 2026 — Page ${data.pageNumber}`, 297 / 2, 205, { align: 'center' });
                doc.setDrawColor(62, 124, 188);
                doc.line(5, 203, 292, 203);
            },
        });
        doc.save(`${filename}.pdf`);
    };

    return new Promise((resolve, reject) => {
        try {
            if (img.complete) {
                buildPdf();
                resolve();
            } else {
                img.onload = () => { buildPdf(); resolve(); };
                img.onerror = () => { buildPdf(); resolve(); };
            }
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Télécharge l'export Word (.docx).
 * @param {import('axios').AxiosInstance} apiClient
 * @param {{ search?: string, publicExport?: boolean, filename?: string }} options
 */
export async function downloadRepertoireDocx(apiClient, options = {}) {
    const {
        search = '',
        publicExport = false,
        filename = DEFAULT_FILENAME,
    } = options;
    const path = publicExport ? '/public/repertoire/export/docx' : '/repertoire/export/docx';
    const params = search?.trim() ? { search: search.trim() } : {};
    const resp = await apiClient.get(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([resp.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    a.click();
    URL.revokeObjectURL(url);
}
