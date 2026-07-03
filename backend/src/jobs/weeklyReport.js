const { notificationService } = require('../services/notification.service');
const { logger } = require('../utils/logger');

const REPORT_EMAIL = process.env.WEEKLY_REPORT_EMAIL || 'alhusseinkhouma0@gmail.com';

/**
 * Génère le rapport hebdomadaire (stats plannings, missions, réunions, utilisateurs)
 * et l'envoie par email.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function runWeeklyReport(prisma) {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
        const [
            usersCount,
            usersByRole,
            planningsCount,
            planningsByStatus,
            missionsCount,
            missionsThisWeek,
            meetingsCount,
            meetingsByStatus,
            roomsCount,
        ] = await Promise.all([
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.groupBy({
                by: ['role'],
                where: { isActive: true },
                _count: { id: true },
            }),
            prisma.planning.count(),
            prisma.planning.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            prisma.mission.count({ where: { status: { not: 'CANCELLED' } } }),
            prisma.mission.count({
                where: {
                    status: { not: 'CANCELLED' },
                    createdAt: { gte: weekAgo },
                },
            }),
            prisma.meeting.count(),
            prisma.meeting.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            prisma.room.count({ where: { status: 'ACTIVE' } }),
        ]);

        const statusLabels = {
            DRAFT: 'Brouillon',
            SUBMITTED: 'Soumis',
            IN_CONSOLIDATION: 'En consolidation',
            CP_PENDING: 'Attente coordinateur projet',
            SG_PENDING: 'Attente SG ou direction',
            DG_PENDING: 'Attente validation finale (SG ou DG)',
            VALIDATED: 'Validé',
            RETURNED: 'Retourné',
            SENT: 'Envoyée',
            CONFIRMED: 'Confirmée',
            CANCELLED: 'Annulée',
        };

        const roleLabels = {
            ADMIN: 'Administrateur',
            RESPONSABLE: 'Responsable',
            CONSOLIDATEUR: 'Consolidateur',
            COORDINATEUR_PROJET: 'Coordinateur de projet',
            SECRETAIRE_GENERAL: 'Secrétaire général',
            DG: 'Directeur Général',
            SUPER_ADMIN: 'Super administrateur',
        };

        const rows = (arr, labelMap) =>
            (arr || [])
                .map((x) => {
                    const key = Object.keys(x).find((k) => k !== '_count');
                    const value = key ? x[key] : '';
                    const label = (labelMap && labelMap[value]) || value;
                    const count = x._count?.id ?? x._count ?? 0;
                    return `<tr><td>${label}</td><td>${count}</td></tr>`;
                })
                .join('');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { color: #1F5C8B; border-bottom: 2px solid #1F5C8B; padding-bottom: 8px; }
    h2 { color: #2a7cb8; font-size: 1.1em; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 24px; }
    .footer { margin-top: 32px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <h1>📋 Rapport hebdomadaire — Gestion Planning</h1>
  <p class="meta">Généré le ${require('../config/timezone').formatFrDateTime(now, { dateStyle: 'full', timeStyle: 'short' })} (GMT+0)</p>

  <h2>👥 Utilisateurs</h2>
  <p><strong>Total actifs :</strong> ${usersCount}</p>
  <table>
    <thead><tr><th>Rôle</th><th>Nombre</th></tr></thead>
    <tbody>${rows(usersByRole, roleLabels)}</tbody>
  </table>

  <h2>📅 Plannings</h2>
  <p><strong>Total :</strong> ${planningsCount}</p>
  <table>
    <thead><tr><th>Statut</th><th>Nombre</th></tr></thead>
    <tbody>${rows(planningsByStatus, statusLabels)}</tbody>
  </table>

  <h2>🎯 Missions</h2>
  <p><strong>Total (hors annulées) :</strong> ${missionsCount}</p>
  <p><strong>Créées cette semaine :</strong> ${missionsThisWeek}</p>

  <h2>📌 Réunions</h2>
  <p><strong>Total :</strong> ${meetingsCount}</p>
  <table>
    <thead><tr><th>Statut</th><th>Nombre</th></tr></thead>
    <tbody>${rows(meetingsByStatus, statusLabels)}</tbody>
  </table>

  <h2>🏢 Salles</h2>
  <p><strong>Salles actives :</strong> ${roomsCount}</p>

  <div class="footer">
    Ce rapport est envoyé automatiquement chaque semaine (tous les lundis).<br>
    Gestion Planning — ${process.env.APP_NAME || 'Application'}
  </div>
</body>
</html>`;

        const subject = `Rapport hebdomadaire Gestion Planning — ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
        await notificationService.sendRawEmail(REPORT_EMAIL, subject, html);
        logger.info('WEEKLY_REPORT_SENT', `Rapport hebdomadaire envoyé à ${REPORT_EMAIL}`);
    } catch (error) {
        logger.error('WEEKLY_REPORT_ERROR', 'Erreur génération/envoi rapport hebdomadaire', {
            error: error.message,
            stack: error.stack,
        });
    }
}

module.exports = { runWeeklyReport, REPORT_EMAIL };
