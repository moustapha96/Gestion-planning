const { notificationService } = require('../services/notification.service');
const { logger } = require('../utils/logger');
const { utcAddDays } = require('../utils/dateUtc');
const { formatFrDate } = require('../config/timezone');

function digestKey(userId) {
    return `notif_pref:${userId}:digest`;
}

function hhmmToHour(value) {
    const h = parseInt(String(value || '08:00').split(':')[0], 10);
    if (Number.isNaN(h) || h < 0 || h > 23) return 8;
    return h;
}

async function runDailyDigest(prisma, now = new Date()) {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true, isDeleted: false },
            select: { id: true, name: true, email: true },
        });
        if (!users.length) return;

        const keys = users.map((u) => digestKey(u.id));
        const prefRows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
        const prefMap = new Map(prefRows.map((r) => [r.key, r.value]));
        const oneDayAgo = utcAddDays(now, -1);
        const currentHour = now.getUTCHours();

        for (const u of users) {
            let digestPref = { enabled: false, time: '08:00' };
            try {
                digestPref = prefMap.get(digestKey(u.id)) ? JSON.parse(prefMap.get(digestKey(u.id))) : digestPref;
            } catch {}
            if (!digestPref?.enabled) continue;
            if (hhmmToHour(digestPref.time) !== currentHour) continue;

            const list = await prisma.notification.findMany({
                where: {
                    userId: u.id,
                    createdAt: { gte: oneDayAgo },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            if (!list.length) continue;

            const rows = list
                .map((n) => `<li style="margin-bottom:8px;"><strong>${n.title || 'Notification'}</strong><br/><span style="color:#666;">${n.body || ''}</span></li>`)
                .join('');

            const html = `
                <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
                  <h2>Digest quotidien</h2>
                  <p>Bonjour ${u.name || ''}, voici vos notifications des dernières 24h :</p>
                  <ul style="padding-left:18px;">${rows}</ul>
                </div>
            `;
            const subject = `Digest quotidien notifications (${formatFrDate(now)})`;
            await notificationService.sendRawEmail(u.email, subject, html);
        }
    } catch (error) {
        logger.error('DAILY_DIGEST_ERROR', error.message, { stack: error.stack });
    }
}

module.exports = { runDailyDigest };
