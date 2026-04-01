const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { emitToUsers } = require('../realtime/socket');
const { isPrivilegedAdmin } = require('../config/roles');
const { logger } = require('../utils/logger');
const { syncDirectionDiscussionMembers } = require('../services/directionDiscussion.service');

const router = express.Router();
const directionUploadDir = path.join(__dirname, '../../uploads/direction-messages');
const uploadDirectionFile = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(directionUploadDir, { recursive: true });
            cb(null, directionUploadDir);
        },
        filename(req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10) || '.bin';
            cb(null, `dir_${req.user?.id || 'u'}_${Date.now()}${ext}`);
        },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
});

async function getMyDirection(prisma, userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            directionId: true,
            direction: { select: { id: true, name: true, code: true, isActive: true } },
        },
    });
    return user || null;
}

router.get('/my-channel', async (req, res) => {
    try {
        const me = await getMyDirection(req.prisma, req.user.id);
        if (!me?.directionId || !me.direction || !me.direction.isActive) {
            return res.status(403).json({ error: "Vous n'êtes rattaché à aucune direction active." });
        }
        const discussion = await syncDirectionDiscussionMembers(req.prisma, me.directionId);
        if (!discussion) {
            return res.status(404).json({ error: 'Aucune discussion de direction disponible.' });
        }

        const messages = await req.prisma.directionMessage.findMany({
            where: { directionId: me.directionId },
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
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

        const members = await req.prisma.directionDiscussionMember.findMany({
            where: { discussionId: discussion.id },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
            orderBy: { joinedAt: 'asc' },
        });

        res.json({
            direction: me.direction,
            discussionId: discussion.id,
            members: members.map((m) => m.user).filter(Boolean),
            messages,
        });
    } catch (error) {
        logger.error('DIRECTION_MESSAGES_GET', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.post('/my-channel', async (req, res) => {
    try {
        const me = await getMyDirection(req.prisma, req.user.id);
        if (!me?.directionId || !me.direction || !me.direction.isActive) {
            return res.status(403).json({ error: "Vous n'êtes rattaché à aucune direction active." });
        }
        const discussion = await syncDirectionDiscussionMembers(req.prisma, me.directionId);
        if (!discussion) {
            return res.status(404).json({ error: 'Aucune discussion de direction disponible.' });
        }
        const body = String(req.body?.body || '').trim();
        const parentId = req.body?.parentId || null;
        if (!body) {
            return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
        }
        if (body.length > 3000) {
            return res.status(400).json({ error: 'Message trop long (3000 caractères max).' });
        }

        if (parentId) {
            const parent = await req.prisma.directionMessage.findUnique({ where: { id: parentId } });
            if (!parent || parent.directionId !== me.directionId) {
                return res.status(400).json({ error: 'Message parent invalide.' });
            }
        }

        const created = await req.prisma.directionMessage.create({
            data: {
                directionId: me.directionId,
                senderId: req.user.id,
                body,
                parentId,
            },
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
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

        const members = await req.prisma.user.findMany({
            where: { directionId: me.directionId, isDeleted: false, isActive: true },
            select: { id: true },
        });
        const memberIds = members.map((u) => u.id);
        emitToUsers(memberIds, 'direction:message:new', {
            directionId: me.directionId,
            directionName: me.direction.name,
            message: created,
        });

        res.status(201).json(created);
    } catch (error) {
        logger.error('DIRECTION_MESSAGES_SEND', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.post('/my-channel/file', uploadDirectionFile.single('file'), async (req, res) => {
    try {
        const me = await getMyDirection(req.prisma, req.user.id);
        if (!me?.directionId || !me.direction || !me.direction.isActive) {
            return res.status(403).json({ error: "Vous n'êtes rattaché à aucune direction active." });
        }
        const discussion = await syncDirectionDiscussionMembers(req.prisma, me.directionId);
        if (!discussion) {
            return res.status(404).json({ error: 'Aucune discussion de direction disponible.' });
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
        const body = String(req.body?.body || '').trim() || null;
        const parentId = req.body?.parentId || null;
        if (body && body.length > 3000) {
            return res.status(400).json({ error: 'Message trop long (3000 caractères max).' });
        }
        if (parentId) {
            const parent = await req.prisma.directionMessage.findUnique({ where: { id: parentId } });
            if (!parent || parent.directionId !== me.directionId) {
                return res.status(400).json({ error: 'Message parent invalide.' });
            }
        }

        const fileUrl = `/uploads/direction-messages/${req.file.filename}`;
        const created = await req.prisma.directionMessage.create({
            data: {
                directionId: me.directionId,
                senderId: req.user.id,
                body,
                parentId,
                fileName: req.file.originalname || req.file.filename,
                fileUrl,
                mimeType: req.file.mimetype || null,
                size: req.file.size || null,
            },
            include: {
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
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

        const members = await req.prisma.user.findMany({
            where: { directionId: me.directionId, isDeleted: false, isActive: true },
            select: { id: true },
        });
        const memberIds = members.map((u) => u.id);
        emitToUsers(memberIds, 'direction:message:new', {
            directionId: me.directionId,
            directionName: me.direction.name,
            message: created,
        });

        res.status(201).json(created);
    } catch (error) {
        logger.error('DIRECTION_MESSAGES_FILE_SEND', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const msg = await req.prisma.directionMessage.findUnique({
            where: { id: req.params.id },
        });
        if (!msg) return res.status(404).json({ error: 'Message introuvable.' });
        if (msg.senderId !== req.user.id && !isPrivilegedAdmin(req.user.role)) {
            return res.status(403).json({ error: 'Non autorisé.' });
        }
        await req.prisma.directionMessage.delete({ where: { id: msg.id } });
        if (msg.fileUrl) {
            const localPath = path.join(directionUploadDir, path.basename(msg.fileUrl || ''));
            try {
                if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            } catch {}
        }
        res.json({ success: true });
    } catch (error) {
        logger.error('DIRECTION_MESSAGES_DELETE', error.message, { userId: req.user?.id, messageId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;

