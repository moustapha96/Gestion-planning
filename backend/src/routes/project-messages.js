const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { emitToUsers } = require('../realtime/socket');
const { isPrivilegedAdmin } = require('../config/roles');
const { logger } = require('../utils/logger');
const { syncProjectDiscussionMembers } = require('../services/projectDiscussion.service');

const router = express.Router();
const projectUploadDir = path.join(__dirname, '../../uploads/project-messages');
const uploadProjectFile = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(projectUploadDir, { recursive: true });
            cb(null, projectUploadDir);
        },
        filename(req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10) || '.bin';
            cb(null, `prj_${req.user?.id || 'u'}_${Date.now()}${ext}`);
        },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
});

async function getMyProject(prisma, userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            projectId: true,
            project: { select: { id: true, name: true, code: true, logoUrl: true, isActive: true, status: true } },
        },
    });
    return user || null;
}

router.get('/my-channel', async (req, res) => {
    try {
        const me = await getMyProject(req.prisma, req.user.id);
        const proj = me?.project;
        if (!me?.projectId || !proj || !proj.isActive || proj.status !== 'ACTIVE') {
            return res.status(403).json({ error: "Vous n'êtes rattaché à aucun projet actif." });
        }
        const discussion = await syncProjectDiscussionMembers(req.prisma, me.projectId);
        if (!discussion) {
            return res.status(404).json({ error: 'Aucune discussion de projet disponible.' });
        }

        const messages = await req.prisma.projectMessage.findMany({
            where: { projectId: me.projectId },
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

        const members = await req.prisma.projectDiscussionMember.findMany({
            where: { discussionId: discussion.id },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
            orderBy: { joinedAt: 'asc' },
        });

        res.json({
            project: me.project,
            discussionId: discussion.id,
            members: members.map((m) => m.user).filter(Boolean),
            messages,
        });
    } catch (error) {
        logger.error('PROJECT_MESSAGES_GET', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.post('/my-channel', async (req, res) => {
    try {
        const me = await getMyProject(req.prisma, req.user.id);
        const proj = me?.project;
        if (!me?.projectId || !proj || !proj.isActive || proj.status !== 'ACTIVE') {
            return res.status(403).json({ error: "Vous n'êtes rattaché à aucun projet actif." });
        }
        const discussion = await syncProjectDiscussionMembers(req.prisma, me.projectId);
        if (!discussion) {
            return res.status(404).json({ error: 'Aucune discussion de projet disponible.' });
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
            const parent = await req.prisma.projectMessage.findUnique({ where: { id: parentId } });
            if (!parent || parent.projectId !== me.projectId) {
                return res.status(400).json({ error: 'Message parent invalide.' });
            }
        }

        const created = await req.prisma.projectMessage.create({
            data: {
                projectId: me.projectId,
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

        const memberUsers = await req.prisma.user.findMany({
            where: { projectId: me.projectId, isDeleted: false, isActive: true },
            select: { id: true },
        });
        const memberIds = memberUsers.map((u) => u.id);
        emitToUsers(memberIds, 'project:message:new', {
            projectId: me.projectId,
            projectName: me.project.name,
            message: created,
        });

        res.status(201).json(created);
    } catch (error) {
        logger.error('PROJECT_MESSAGES_SEND', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.post('/my-channel/file', uploadProjectFile.single('file'), async (req, res) => {
    try {
        const me = await getMyProject(req.prisma, req.user.id);
        const proj = me?.project;
        if (!me?.projectId || !proj || !proj.isActive || proj.status !== 'ACTIVE') {
            return res.status(403).json({ error: "Vous n'êtes rattaché à aucun projet actif." });
        }
        const discussion = await syncProjectDiscussionMembers(req.prisma, me.projectId);
        if (!discussion) {
            return res.status(404).json({ error: 'Aucune discussion de projet disponible.' });
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
            const parent = await req.prisma.projectMessage.findUnique({ where: { id: parentId } });
            if (!parent || parent.projectId !== me.projectId) {
                return res.status(400).json({ error: 'Message parent invalide.' });
            }
        }

        const fileUrl = `/uploads/project-messages/${req.file.filename}`;
        const created = await req.prisma.projectMessage.create({
            data: {
                projectId: me.projectId,
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

        const memberUsers = await req.prisma.user.findMany({
            where: { projectId: me.projectId, isDeleted: false, isActive: true },
            select: { id: true },
        });
        const memberIds = memberUsers.map((u) => u.id);
        emitToUsers(memberIds, 'project:message:new', {
            projectId: me.projectId,
            projectName: me.project.name,
            message: created,
        });

        res.status(201).json(created);
    } catch (error) {
        logger.error('PROJECT_MESSAGES_FILE_SEND', error.message, { userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const msg = await req.prisma.projectMessage.findUnique({
            where: { id: req.params.id },
        });
        if (!msg) return res.status(404).json({ error: 'Message introuvable.' });
        if (msg.senderId !== req.user.id && !isPrivilegedAdmin(req.user.role)) {
            return res.status(403).json({ error: 'Non autorisé.' });
        }
        await req.prisma.projectMessage.delete({ where: { id: msg.id } });
        if (msg.fileUrl) {
            const localPath = path.join(projectUploadDir, path.basename(msg.fileUrl || ''));
            try {
                if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            } catch {}
        }
        res.json({ success: true });
    } catch (error) {
        logger.error('PROJECT_MESSAGES_DELETE', error.message, { userId: req.user?.id, messageId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
