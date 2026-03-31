const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { logger } = require('../utils/logger');
const { emitToUsers } = require('../realtime/socket');
const roleMiddleware = require('../middlewares/role.middleware');
const { ROLES, isPrivilegedAdmin } = require('../config/roles');

const router = express.Router();
const dmUploadDir = path.join(__dirname, '../../uploads/direct-messages');
const uploadDirectFile = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(dmUploadDir, { recursive: true });
            cb(null, dmUploadDir);
        },
        filename(req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10) || '.bin';
            cb(null, `dm_${req.user?.id || 'u'}_${Date.now()}${ext}`);
        },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
});

async function isDirectMessagesEnabled(prisma) {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'direct_messages_enabled' } });
    return String(setting?.value ?? 'true') === 'true';
}

router.use(async (req, res, next) => {
    try {
        const enabled = await isDirectMessagesEnabled(req.prisma);
        if (!enabled) {
            return res.status(403).json({ error: 'La messagerie directe est désactivée par l\'administrateur.' });
        }
        return next();
    } catch (error) {
        logger.error('DIRECT_MESSAGES_SETTING_CHECK', error.message, { userId: req.user?.id });
        return res.status(500).json({ error: 'Erreur vérification paramètres messagerie.' });
    }
});

/** Liste des paires de conversation (dernier message) — Super administrateur uniquement */
router.get('/audit/conversations', roleMiddleware([ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const messages = await req.prisma.directMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8000,
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
                receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
        const seen = new Map();
        for (const m of messages) {
            const key = m.senderId < m.receiverId ? `${m.senderId}:${m.receiverId}` : `${m.receiverId}:${m.senderId}`;
            if (seen.has(key)) continue;
            seen.set(key, {
                userA: m.sender,
                userB: m.receiver,
                lastMessage: m.body || m.fileName || 'Fichier',
                lastAt: m.createdAt,
            });
        }
        res.json(Array.from(seen.values()));
    } catch (error) {
        logger.error('DM_AUDIT_CONVERSATIONS', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

/** Fil de discussion entre deux utilisateurs — Super administrateur uniquement (lecture / modération) */
router.get('/audit/thread/:userId1/:userId2', roleMiddleware([ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const u1 = req.params.userId1;
        const u2 = req.params.userId2;
        if (!u1 || !u2 || u1 === u2) {
            return res.status(400).json({ error: 'Paire invalide.' });
        }
        const messages = await req.prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: u1, receiverId: u2 },
                    { senderId: u2, receiverId: u1 },
                ],
            },
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
                receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
                parent: {
                    select: {
                        id: true,
                        body: true,
                        fileName: true,
                        sender: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: 2000,
        });
        res.json({ messages });
    } catch (error) {
        logger.error('DM_AUDIT_THREAD', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await req.prisma.user.findMany({
            where: { isDeleted: false, isActive: true, id: { not: req.user.id } },
            select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            orderBy: { name: 'asc' },
        });
        res.json(users);
    } catch (error) {
        logger.error('DIRECT_MESSAGES_USERS', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.get('/conversations', async (req, res) => {
    try {
        const mine = req.user.id;
        const [messages, unreadGrouped] = await Promise.all([
            req.prisma.directMessage.findMany({
                where: {
                    OR: [{ senderId: mine }, { receiverId: mine }],
                },
                include: {
                    sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 300,
            }),
            req.prisma.directMessage.groupBy({
                by: ['senderId'],
                where: { receiverId: mine, isRead: false },
                _count: { _all: true },
            }),
        ]);
        const unreadMap = new Map(unreadGrouped.map((r) => [r.senderId, r._count._all]));

        const map = new Map();
        for (const m of messages) {
            const other = m.senderId === mine ? m.receiver : m.sender;
            if (!other) continue;
            if (!map.has(other.id)) {
                map.set(other.id, {
                    user: other,
                    lastMessage: m.body || m.fileName || 'Fichier',
                    lastAt: m.createdAt,
                    lastFromMe: m.senderId === mine,
                    unreadCount: unreadMap.get(other.id) || 0,
                });
            }
        }
        res.json(Array.from(map.values()));
    } catch (error) {
        logger.error('DIRECT_MESSAGES_CONVERSATIONS', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.get('/:userId', async (req, res) => {
    try {
        const me = req.user.id;
        const otherId = req.params.userId;
        if (!otherId || otherId === me) {
            return res.status(400).json({ error: 'Conversation invalide.' });
        }

        const other = await req.prisma.user.findUnique({
            where: { id: otherId },
            select: { id: true, name: true, email: true, avatarUrl: true, isActive: true, isDeleted: true },
        });
        if (!other || other.isDeleted) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        const unreadIncoming = await req.prisma.directMessage.findMany({
            where: {
                senderId: otherId,
                receiverId: me,
                isRead: false,
            },
            select: { id: true },
        });

        await req.prisma.directMessage.updateMany({
            where: {
                senderId: otherId,
                receiverId: me,
                isRead: false,
            },
            data: { isRead: true },
        });

        if (unreadIncoming.length > 0) {
            emitToUsers([otherId], 'direct:messages:read', {
                readerId: me,
                conversationUserId: otherId,
                messageIds: unreadIncoming.map((m) => m.id),
                readAt: new Date().toISOString(),
            });
        }

        const messages = await req.prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: me, receiverId: otherId },
                    { senderId: otherId, receiverId: me },
                ],
            },
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
                receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
                parent: {
                    select: {
                        id: true,
                        body: true,
                        fileName: true,
                        sender: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: 500,
        });

        res.json({ other, messages });
    } catch (error) {
        logger.error('DIRECT_MESSAGES_LIST', error.message, { userId: req.user?.id, otherId: req.params.userId });
        res.status(400).json({ error: error.message });
    }
});

router.post('/:userId', async (req, res) => {
    try {
        const me = req.user.id;
        const otherId = req.params.userId;
        const body = String(req.body?.body || '').trim();
        const parentId = req.body?.parentId || null;
        if (!otherId || otherId === me) {
            return res.status(400).json({ error: 'Destinataire invalide.' });
        }
        if (!body) {
            return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
        }
        if (body.length > 3000) {
            return res.status(400).json({ error: 'Message trop long (3000 caractères max).' });
        }

        const other = await req.prisma.user.findUnique({
            where: { id: otherId },
            select: { id: true, isActive: true, isDeleted: true },
        });
        if (!other || other.isDeleted || !other.isActive) {
            return res.status(404).json({ error: 'Destinataire indisponible.' });
        }
        if (parentId) {
            const parent = await req.prisma.directMessage.findUnique({ where: { id: parentId } });
            const inSameConversation = parent && (
                (parent.senderId === me && parent.receiverId === otherId) ||
                (parent.senderId === otherId && parent.receiverId === me)
            );
            if (!inSameConversation) {
                return res.status(400).json({ error: 'Message parent invalide.' });
            }
        }

        const created = await req.prisma.directMessage.create({
            data: {
                senderId: me,
                receiverId: otherId,
                body,
                parentId,
                isRead: false,
            },
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
                receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
                parent: {
                    select: {
                        id: true,
                        body: true,
                        fileName: true,
                        sender: { select: { id: true, name: true } },
                    },
                },
            },
        });
        emitToUsers([me, otherId], 'direct:message:new', { userId: me, toUserId: otherId, message: created });
        res.status(201).json(created);
    } catch (error) {
        logger.error('DIRECT_MESSAGES_SEND', error.message, { userId: req.user?.id, otherId: req.params.userId });
        res.status(400).json({ error: error.message });
    }
});

router.post('/:userId/file', uploadDirectFile.single('file'), async (req, res) => {
    try {
        const me = req.user.id;
        const otherId = req.params.userId;
        const parentId = req.body?.parentId || null;
        if (!otherId || otherId === me) {
            return res.status(400).json({ error: 'Destinataire invalide.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier reçu.' });
        }
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png',
        ];
        if (req.file.mimetype && !allowed.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Format non autorisé. Utilisez Word, PDF ou PNG.' });
        }
        const other = await req.prisma.user.findUnique({
            where: { id: otherId },
            select: { id: true, isActive: true, isDeleted: true },
        });
        if (!other || other.isDeleted || !other.isActive) {
            return res.status(404).json({ error: 'Destinataire indisponible.' });
        }
        if (parentId) {
            const parent = await req.prisma.directMessage.findUnique({ where: { id: parentId } });
            const inSameConversation = parent && (
                (parent.senderId === me && parent.receiverId === otherId) ||
                (parent.senderId === otherId && parent.receiverId === me)
            );
            if (!inSameConversation) {
                return res.status(400).json({ error: 'Message parent invalide.' });
            }
        }
        const fileUrl = `/uploads/direct-messages/${req.file.filename}`;
        const created = await req.prisma.directMessage.create({
            data: {
                senderId: me,
                receiverId: otherId,
                parentId,
                body: String(req.body?.body || '').trim() || null,
                fileName: req.file.originalname || req.file.filename,
                fileUrl,
                mimeType: req.file.mimetype || null,
                size: req.file.size || null,
                isRead: false,
            },
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
                receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
                parent: {
                    select: {
                        id: true,
                        body: true,
                        fileName: true,
                        sender: { select: { id: true, name: true } },
                    },
                },
            },
        });
        emitToUsers([me, otherId], 'direct:message:new', { userId: me, toUserId: otherId, message: created });
        res.status(201).json(created);
    } catch (error) {
        logger.error('DIRECT_MESSAGES_FILE_SEND', error.message, { userId: req.user?.id, otherId: req.params.userId });
        res.status(400).json({ error: error.message });
    }
});

router.delete('/message/:messageId', async (req, res) => {
    try {
        const me = req.user.id;
        const msg = await req.prisma.directMessage.findUnique({ where: { id: req.params.messageId } });
        if (!msg) return res.status(404).json({ error: 'Message introuvable.' });
        if (msg.senderId !== me && !isPrivilegedAdmin(req.user.role)) {
            return res.status(403).json({ error: 'Seul l\'auteur ou un administrateur peut supprimer ce message.' });
        }
        await req.prisma.directMessage.delete({ where: { id: msg.id } });
        if (msg.fileUrl) {
            const localPath = path.join(dmUploadDir, path.basename(msg.fileUrl || ''));
            try {
                if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            } catch {}
        }
        res.json({ success: true });
    } catch (error) {
        logger.error('DIRECT_MESSAGES_DELETE', error.message, { userId: req.user?.id, messageId: req.params.messageId });
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
