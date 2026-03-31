const express = require('express');
const { logger, auditLogger } = require('../utils/logger');
const { notificationService } = require('../services/notification.service');
const roleMiddleware = require('../middlewares/role.middleware');
const { ADMIN_ROUTE_ROLES } = require('../config/roles');

const router = express.Router();
const DEFAULT_CHANNELS = {
  DEFAULT: { inApp: true, email: true },
};
const DEFAULT_QUIET_HOURS = {
  enabled: false,
  start: '22:00',
  end: '07:00',
};
const DEFAULT_DIGEST = {
  enabled: false,
  time: '08:00',
};

const keyChannels = (userId) => `notif_pref:${userId}:channels`;
const keyQuietHours = (userId) => `notif_pref:${userId}:quiet_hours`;
const keyDigest = (userId) => `notif_pref:${userId}:digest`;

function parseJsonOrDefault(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Récupérer les notifications de l'utilisateur
 *     description: Récupère les notifications de l'utilisateur avec pagination
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Liste des notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                 total:
 *                   type: integer
 *                 unread:
 *                   type: integer
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const result = await notificationService.getNotifications(
      req.prisma,
      req.user.id,
      skip,
      limit
    );

    logger.info('GET_NOTIFICATIONS', `User ${req.user.email} fetched notifications`, {
      userId: req.user.id,
      page,
      limit,
      total: result.total,
      unread: result.unread,
    });

    res.json(result);
  } catch (error) {
    logger.error('GET_NOTIFICATIONS_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/unread/count:
 *   get:
 *     summary: Compter les notifications non lues
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Nombre de notifications non lues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unread:
 *                   type: integer
 */
router.get('/unread/count', async (req, res) => {
  try {
    const unread = await notificationService.getUnreadCount(req.prisma, req.user.id);

    res.json({ unread });
  } catch (error) {
    logger.error('UNREAD_COUNT_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/preferences
 * Préférences notifications utilisateur connecté
 */
router.get('/preferences', async (req, res) => {
  try {
    const keys = [keyChannels(req.user.id), keyQuietHours(req.user.id), keyDigest(req.user.id)];
    const rows = await req.prisma.appSetting.findMany({ where: { key: { in: keys } } });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({
      channels: parseJsonOrDefault(byKey[keyChannels(req.user.id)], DEFAULT_CHANNELS),
      quietHours: parseJsonOrDefault(byKey[keyQuietHours(req.user.id)], DEFAULT_QUIET_HOURS),
      dailyDigest: parseJsonOrDefault(byKey[keyDigest(req.user.id)], DEFAULT_DIGEST),
    });
  } catch (error) {
    logger.error('GET_NOTIFICATION_PREFS_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/notifications/preferences
 * Body: { channels, quietHours, dailyDigest }
 */
router.put('/preferences', async (req, res) => {
  try {
    const channels = req.body?.channels || DEFAULT_CHANNELS;
    const quietHours = req.body?.quietHours || DEFAULT_QUIET_HOURS;
    const dailyDigest = req.body?.dailyDigest || DEFAULT_DIGEST;
    const updates = [
      req.prisma.appSetting.upsert({
        where: { key: keyChannels(req.user.id) },
        update: { value: JSON.stringify(channels) },
        create: { key: keyChannels(req.user.id), value: JSON.stringify(channels) },
      }),
      req.prisma.appSetting.upsert({
        where: { key: keyQuietHours(req.user.id) },
        update: { value: JSON.stringify(quietHours) },
        create: { key: keyQuietHours(req.user.id), value: JSON.stringify(quietHours) },
      }),
      req.prisma.appSetting.upsert({
        where: { key: keyDigest(req.user.id) },
        update: { value: JSON.stringify(dailyDigest) },
        create: { key: keyDigest(req.user.id), value: JSON.stringify(dailyDigest) },
      }),
    ];
    await Promise.all(updates);
    res.json({ success: true });
  } catch (error) {
    logger.error('PUT_NOTIFICATION_PREFS_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.prisma, req.params.id);

    auditLogger.info('NOTIFICATION_MARKED_READ', `User ${req.user.email} marked notification as read`, {
      userId: req.user.id,
      notificationId: req.params.id,
    });

    res.json(notification);
  } catch (error) {
    logger.error('MARK_AS_READ_ERROR', error.message, {
      userId: req.user.id,
      notificationId: req.params.id,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Marquer toutes les notifications comme lues
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Toutes les notifications marquées comme lues
 */
router.put('/read-all', async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.prisma, req.user.id);

    auditLogger.info('ALL_NOTIFICATIONS_MARKED_READ', `User ${req.user.email} marked all notifications as read`, {
      userId: req.user.id,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('MARK_ALL_AS_READ_ERROR', error.message, { userId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Supprimer une notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification supprimée
 */
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.notification.delete({
      where: { id: req.params.id },
    });

    auditLogger.info('NOTIFICATION_DELETED', `User ${req.user.email} deleted notification`, {
      userId: req.user.id,
      notificationId: req.params.id,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('DELETE_NOTIFICATION_ERROR', error.message, {
      userId: req.user.id,
      notificationId: req.params.id,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/admin/send:
 *   post:
 *     summary: Envoyer une notification in-app à plusieurs utilisateurs (ADMIN)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [audience, title, body]
 *             properties:
 *               audience:
 *                 type: string
 *                 enum: [ALL, ROLE, USERS]
 *                 description: Cible de la notification
 *               role:
 *                 type: string
 *                 description: Rôle ciblé (si audience = ROLE)
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs utilisateurs ciblés (si audience = USERS)
 *               type:
 *                 type: string
 *                 description: "Type fonctionnel (ex: ADMIN_BROADCAST)"
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               link:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Notifications créées
 */
router.post('/admin/send', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
  try {
    const { audience, role, userIds, type, title, body, link } = req.body || {};

    if (!audience || !['ALL', 'ROLE', 'USERS'].includes(audience)) {
      return res.status(400).json({ error: 'Audience invalide (ALL, ROLE, USERS)' });
    }
    if (!title || !body) {
      return res.status(400).json({ error: 'Titre et message requis' });
    }

    let targetsWhere = { isActive: true };

    if (audience === 'ROLE') {
      if (!role) return res.status(400).json({ error: 'Rôle requis pour audience=ROLE' });
      targetsWhere.role = role;
    } else if (audience === 'USERS') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'Liste userIds requise pour audience=USERS' });
      }
      targetsWhere.id = { in: userIds };
    }

    const targetUsers = await req.prisma.user.findMany({
      where: targetsWhere,
      select: { id: true },
    });

    if (!targetUsers || targetUsers.length === 0) {
      return res.status(400).json({ error: 'Aucun utilisateur cible trouvé pour ces critères' });
    }

    const ids = targetUsers.map((u) => u.id);

    const results = await notificationService.sendBulkNotification(
      req.prisma,
      ids,
      type || 'ADMIN_BROADCAST',
      title,
      body,
      link || null
    );

    auditLogger.info('ADMIN_NOTIFICATIONS_SENT', `Admin ${req.user.email} a envoyé une notification`, {
      adminId: req.user.id,
      audience,
      role: role || null,
      targetCount: ids.length,
    });

    res.json({
      success: true,
      total: ids.length,
      sent: results.filter((r) => r.success).length,
    });
  } catch (error) {
    logger.error('ADMIN_SEND_NOTIFICATIONS_ERROR', error.message, { adminId: req.user.id });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
