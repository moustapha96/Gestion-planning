const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const roleMiddleware = require('../middlewares/role.middleware');
const { notificationService } = require('../services/notification.service');
const { autoCloseExpiredMeetings } = require('../services/meeting.service');
const { logger } = require('../utils/logger');
const { isRoomAvailableForSlot, isRoomActive } = require('../utils/availability');
const { formatAppTimeHm } = require('../utils/roomBooking');
const { appDayBoundsFromYmd, toAppYmd } = require('../utils/calendarEvents');
const { createAuditLog } = require('../utils/audit');
const { ROLES, isPrivilegedAdmin, isSuperAdmin, isResponsable } = require('../config/roles');
const { MEETING_PENDING_FINAL } = require('../config/meetingWorkflow');
const { isPendingCoordinatorValidation } = require('../config/planningWorkflow');
const {
    canPublishMeeting,
    canEditMeeting,
    canManageMeeting,
    requiresConsolidatorApproval,
    meetingListWhereForUser,
    canViewMeetingForUser,
} = require('../config/meetingVisibility');
const {
    canConsolidateDraftMeeting,
    canApproveDraftMeeting,
    canFinalizePendingMeeting,
} = require('../services/validationPolicy.service');
const { notifyMeetingPendingFinalApproval } = require('../services/projectCoordinator.service');
const { emitToUsers, emitToMeetingRoom } = require('../realtime/socket');
const { pdfOnlyMulterFileFilter, wrapMulterUpload } = require('../utils/pdfUpload');
const { resolveMeetingEventTypeId } = require('../services/eventType.service');
const { buildPublicApiUrl } = require('../utils/appUrls');

const EVENT_TYPE_INCLUDE = { select: { id: true, name: true, code: true, color: true } };

const router = express.Router();
let meetingFilesFeatureChecked = false;
let meetingFilesFeatureEnabled = false;
let lastAutoCloseRunAt = 0;

async function canUseMeetingFiles(prisma) {
    if (meetingFilesFeatureChecked) return meetingFilesFeatureEnabled;
    try {
        await prisma.meetingFile.count({ take: 1 });
        meetingFilesFeatureEnabled = true;
    } catch {
        meetingFilesFeatureEnabled = false;
    } finally {
        meetingFilesFeatureChecked = true;
    }
    return meetingFilesFeatureEnabled;
}

function canViewMeeting(meeting, user) {
    return canViewMeetingForUser(meeting, user);
}

function isParticipant(meeting, user) {
    if (!meeting || !user) return false;
    return (
        meeting.organizerId === user.id ||
        meeting.invitations?.some((inv) => inv.userId === user.id) ||
        isPrivilegedAdmin(user.role)
    );
}

function canSendMeetingMessage(meeting, user) {
    if (!meeting || !user) return false;
    return (
        meeting.organizerId === user.id ||
        meeting.invitations?.some((inv) => inv.userId === user.id && inv.status === 'ACCEPTED') ||
        isPrivilegedAdmin(user.role)
    );
}

function canReopenMeeting(meeting, user) {
    if (!meeting || !user) return false;
    // Demande métier: admin, RESPONSABLE, ou créateur de la réunion
    return isPrivilegedAdmin(user.role) || user.role === ROLES.RESPONSABLE || meeting.organizerId === user.id;
}

async function maybeAutoCloseMeetings(prisma) {
    const now = Date.now();
    if (now - lastAutoCloseRunAt < 60_000) return;
    lastAutoCloseRunAt = now;
    await autoCloseExpiredMeetings(prisma);
}

function normalizeMeetingLink(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
        const parsed = new URL(raw);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function buildInvitationActionUrl(req, invitationId, status) {
    const token = jwt.sign(
        { purpose: 'meeting_invitation_response', invitationId, status },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    return buildPublicApiUrl('/public/meeting-invitations/respond', { token });
}

/** Publie une réunion (réservation salle + convocations + statut CONFIRMED). */
async function publishMeeting(req, meeting) {
    if (meeting.roomId) {
        const active = await isRoomActive(req.prisma, meeting.roomId);
        if (!active) {
            const err = new Error('La salle de cette réunion est désactivée. Réactivez la salle ou choisissez une autre salle avant de publier.');
            err.statusCode = 410;
            throw err;
        }
        const available = await isRoomAvailableForSlot(
            req.prisma,
            meeting.roomId,
            meeting.startTime,
            meeting.endTime,
            meeting.id,
        );
        if (!available) {
            const err = new Error('La salle n\'est plus disponible sur ce créneau. Choisissez un autre horaire ou une autre salle.');
            err.statusCode = 409;
            throw err;
        }
        const dateForBooking = appDayBoundsFromYmd(toAppYmd(meeting.startTime)).start;
        const startStr = formatAppTimeHm(meeting.startTime);
        const endStr = formatAppTimeHm(meeting.endTime);
        const existingBooking = await req.prisma.roomBooking.findUnique({
            where: { meetingId: meeting.id },
        });
        if (existingBooking) {
            await req.prisma.roomBooking.update({
                where: { id: existingBooking.id },
                data: {
                    roomId: meeting.roomId,
                    userId: req.user.id,
                    date: dateForBooking,
                    startTime: startStr,
                    endTime: endStr,
                    status: 'CONFIRMED',
                },
            });
        } else {
            await req.prisma.roomBooking.create({
                data: {
                    roomId: meeting.roomId,
                    meetingId: meeting.id,
                    userId: req.user.id,
                    date: dateForBooking,
                    startTime: startStr,
                    endTime: endStr,
                },
            });
        }
    }

    const convocationChannel = meeting.meetingLink
        ? `Salle: ${meeting.room?.name || '—'} · Visio: disponible`
        : `Salle: ${meeting.room?.name || '—'}`;
    for (const inv of meeting.invitations) {
        const acceptUrl = buildInvitationActionUrl(req, inv.id, 'ACCEPTED');
        const declineUrl = buildInvitationActionUrl(req, inv.id, 'DECLINED');
        await notificationService.sendFullNotification(
            req.prisma,
            inv.user.id,
            inv.user.email,
            'MEETING_CONVOCATION',
            'MEETING_CONVOCATION',
            [inv.user, meeting, meeting.room, { acceptUrl, declineUrl }],
            `Convocation : ${meeting.title}`,
            `Vous êtes convoqué(e) le ${new Date(meeting.startTime).toLocaleDateString('fr-FR')} (${convocationChannel})`,
            `/meetings`,
        );
    }

    const updated = await req.prisma.meeting.update({
        where: { id: meeting.id },
        data: {
            status: 'CONFIRMED',
            invitations: {
                updateMany: { where: {}, data: { sentAt: new Date() } },
            },
        },
    });

    logger.info('MEETING_CONFIRMED', `Réunion publiée « ${meeting.title} »`, {
        meetingId: meeting.id,
        publishedBy: req.user.id,
        participantCount: meeting.invitations.length,
    });

    await createAuditLog(req, 'MEETING_CONFIRMED', 'Meeting', meeting.id, `Réunion « ${meeting.title} » publiée`);

    return updated;
}

const {
    notifyConsolidatorsPendingMeeting,
    resolveProjectIdForConsolidation,
} = require('../services/projectConsolidator.service');
const { validateProjectForUserAction, PROJECT_WITH_RESPONSIBLE_SELECT } = require('../services/projectResponsible.service');

const meetingsUploadDir = path.join(__dirname, '../../uploads/meetings');
const uploadMeetingFile = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(meetingsUploadDir, { recursive: true });
            cb(null, meetingsUploadDir);
        },
        filename(req, _file, cb) {
            cb(null, `${req.params.id}_${Date.now()}.pdf`);
        },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: pdfOnlyMulterFileFilter,
});

/**
 * @swagger
 * tags:
 *   name: Meetings
 *   description: Gestion des réunions et convocations
 */

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: Lister les réunions de l'utilisateur
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des réunions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Meeting'
 *                   - type: object
 *                     properties:
 *                       organizer:
 *                         $ref: '#/components/schemas/User'
 *                       room:
 *                         $ref: '#/components/schemas/Room'
 *                       invitations:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Invitation'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res) => {
    try {
        await maybeAutoCloseMeetings(req.prisma);
        const q = String(req.query.q || '').trim();
        const directionId = String(req.query.directionId || '').trim() || null;
        const projectId = String(req.query.projectId || '').trim() || null;
        const status = String(req.query.status || '').trim() || null;
        const from = req.query.from ? new Date(req.query.from) : null;
        const to = req.query.to ? new Date(req.query.to) : null;
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const skip = (page - 1) * limit;
        const contains = q ? { contains: q, mode: 'insensitive' } : null;
        const includeFiles = await canUseMeetingFiles(req.prisma);
        const whereParts = [meetingListWhereForUser(req.user)];
        if (status) whereParts.push({ status });
        if (from || to) {
            whereParts.push({ startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
        }
        if (directionId) whereParts.push({ directionId });
        if (projectId) whereParts.push({ projectId });
        if (contains) {
            whereParts.push({
                OR: [
                    { title: contains },
                    { agenda: contains },
                    { room: { is: { name: contains } } },
                    { direction: { is: { name: contains } } },
                    { direction: { is: { code: contains } } },
                    { project: { is: { name: contains } } },
                    { project: { is: { code: contains } } },
                ],
            });
        }
        const where = whereParts.length === 1 ? whereParts[0] : { AND: whereParts };

        const [meetings, total] = await Promise.all([
            req.prisma.meeting.findMany({
                where,
                include: {
                    organizer: { select: { name: true, email: true, role: true } },
                    room: true,
                    direction: { select: { id: true, name: true, code: true } },
                    project: { select: { ...PROJECT_WITH_RESPONSIBLE_SELECT, consolidatorId: true, coordinatorId: true } },
                    eventType: EVENT_TYPE_INCLUDE,
                    invitations: { include: { user: true } },
                    ...(includeFiles
                        ? {
                              files: {
                                  include: { uploadedBy: { select: { id: true, name: true, email: true } } },
                                  orderBy: { createdAt: 'desc' },
                              },
                          }
                        : {}),
                },
                orderBy: { startTime: 'desc' },
                skip,
                take: limit,
            }),
            req.prisma.meeting.count({ where }),
        ]);
        const items = (meetings || []).map((m) => ({ ...m, files: m.files || [] }));
        if (q || directionId || projectId || status || from || to || req.query.page || req.query.limit) {
            return res.json({
                items,
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            });
        }
        return res.json(items);
    } catch (error) {
        logger.error('GET_MEETINGS', 'Erreur récupération réunions', {
            userId: req.user.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Récupérer le détail d'une réunion
 *     tags: [Meetings]
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
 *         description: Détail de la réunion
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/:id', async (req, res) => {
    try {
        await maybeAutoCloseMeetings(req.prisma);
        const includeFiles = await canUseMeetingFiles(req.prisma);
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: {
                organizer: true,
                room: true,
                direction: { select: { id: true, name: true, code: true } },
                project: { select: { ...PROJECT_WITH_RESPONSIBLE_SELECT, consolidatorId: true, coordinatorId: true } },
                eventType: EVENT_TYPE_INCLUDE,
                invitations: { include: { user: true } },
                messages: {
                    include: {
                        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
                        parent: {
                            select: {
                                id: true,
                                body: true,
                                sender: { select: { id: true, name: true } },
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                ...(includeFiles
                    ? {
                          files: {
                              include: { uploadedBy: { select: { id: true, name: true, email: true } } },
                              orderBy: { createdAt: 'desc' },
                          },
                      }
                    : {}),
            },
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (!canViewMeeting(meeting, req.user)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        res.json({ ...meeting, files: meeting.files || [], messages: meeting.messages || [] });
    } catch (error) {
        logger.error('GET_MEETING', 'Erreur récupération réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

// POST /api/meetings/:id/messages - envoyer un message dans la réunion
router.post('/:id/messages', async (req, res) => {
    try {
        const body = String(req.body?.body || '').trim();
        const parentId = req.body?.parentId || null;
        if (!body) {
            return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
        }
        if (body.length > 3000) {
            return res.status(400).json({ error: 'Le message est trop long (3000 caractères max).' });
        }

        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: { invitations: true },
        });
        if (!meeting) return res.status(404).json({ error: 'Réunion introuvable' });
        if (!canSendMeetingMessage(meeting, req.user)) {
            return res.status(403).json({ error: 'Seuls les participants ayant accepté peuvent envoyer des messages.' });
        }
        if (meeting.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Impossible d\'envoyer un message sur une réunion annulée.' });
        }
        if (meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Impossible d\'envoyer un message sur une réunion terminée.' });
        }

        if (parentId) {
            const parentMsg = await req.prisma.meetingMessage.findUnique({ where: { id: parentId } });
            if (!parentMsg || parentMsg.meetingId !== meeting.id) {
                return res.status(400).json({ error: 'Message parent invalide.' });
            }
        }

        const created = await req.prisma.meetingMessage.create({
            data: {
                meetingId: meeting.id,
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
                        sender: { select: { id: true, name: true } },
                    },
                },
            },
        });

        const participantIds = [
            meeting.organizerId,
            ...(meeting.invitations || []).map((inv) => inv.userId),
        ];
        emitToUsers(participantIds, 'meeting:message:new', { meetingId: meeting.id, message: created });
        emitToMeetingRoom(meeting.id, 'meeting:message:new', { meetingId: meeting.id, message: created });

        res.status(201).json(created);
    } catch (error) {
        logger.error('MEETING_MESSAGE_CREATE', error.message, { meetingId: req.params.id, userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/meetings/:id/messages/:messageId — auteur ou administrateur / super administrateur
router.delete('/:id/messages/:messageId', async (req, res) => {
    try {
        const msg = await req.prisma.meetingMessage.findUnique({
            where: { id: req.params.messageId },
            include: { meeting: { include: { invitations: true } } },
        });
        if (!msg || msg.meetingId !== req.params.id) {
            return res.status(404).json({ error: 'Message introuvable' });
        }
        if (msg.meeting.status === 'CANCELLED' || msg.meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Réunion finalisée : suppression de message impossible.' });
        }
        const canDelete = msg.senderId === req.user.id || isPrivilegedAdmin(req.user.role);
        if (!canDelete) {
            return res.status(403).json({ error: 'Seul l\'auteur ou un administrateur peut supprimer ce message.' });
        }
        await req.prisma.meetingMessage.delete({ where: { id: msg.id } });
        const participantIds = [
            msg.meeting.organizerId,
            ...(msg.meeting.invitations || []).map((inv) => inv.userId),
        ];
        emitToUsers(participantIds, 'meeting:message:deleted', { meetingId: msg.meetingId, messageId: msg.id });
        emitToMeetingRoom(msg.meetingId, 'meeting:message:deleted', { meetingId: msg.meetingId, messageId: msg.id });
        res.json({ success: true });
    } catch (error) {
        logger.error('MEETING_MESSAGE_DELETE', error.message, { meetingId: req.params.id, userId: req.user?.id });
        res.status(400).json({ error: error.message });
    }
});

// POST /api/meetings/:id/files - ajouter un PDF (document ou compte rendu)
router.post('/:id/files', wrapMulterUpload(uploadMeetingFile.single('file')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier envoyé. Utilisez le champ "file".' });
        }

        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: { invitations: true },
        });
        if (!meeting) return res.status(404).json({ error: 'Réunion introuvable' });
        if (!isParticipant(meeting, req.user)) {
            return res.status(403).json({ error: 'Seuls les participants peuvent ajouter des fichiers.' });
        }
        if (meeting.status === 'CANCELLED' || meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Réunion finalisée : ajout de fichier impossible.' });
        }

        const rawKind = String(req.body?.kind || 'DOCUMENT').toUpperCase();
        const allowedKinds = ['DOCUMENT', 'REPORT'];
        const kind = allowedKinds.includes(rawKind) ? rawKind : 'DOCUMENT';
        const fileUrl = `/uploads/meetings/${req.file.filename}`;

        const saved = await req.prisma.meetingFile.create({
            data: {
                meetingId: meeting.id,
                uploadedById: req.user.id,
                kind,
                fileName: req.file.originalname || req.file.filename,
                fileUrl,
                mimeType: req.file.mimetype || null,
                size: req.file.size || null,
            },
            include: { uploadedBy: { select: { id: true, name: true, email: true } } },
        });

        await createAuditLog(req, 'MEETING_FILE_ADDED', 'MeetingFile', saved.id, `Fichier "${saved.fileName}" ajouté (${kind})`);
        res.status(201).json(saved);
    } catch (error) {
        logger.error('MEETING_FILE_ADD', error.message, { meetingId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/meetings/:id/files/:fileId - suppression par l'auteur uniquement
router.delete('/:id/files/:fileId', async (req, res) => {
    try {
        const file = await req.prisma.meetingFile.findUnique({
            where: { id: req.params.fileId },
            include: { meeting: { include: { invitations: true } } },
        });
        if (!file || file.meetingId !== req.params.id) {
            return res.status(404).json({ error: 'Fichier introuvable' });
        }
        if (!isParticipant(file.meeting, req.user)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        if (file.meeting.status === 'CANCELLED' || file.meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Réunion finalisée : suppression de fichier impossible.' });
        }
        if (file.uploadedById !== req.user.id && !isPrivilegedAdmin(req.user.role)) {
            return res.status(403).json({ error: 'Seul l\'utilisateur ayant ajouté ce fichier ou un administrateur peut le supprimer.' });
        }

        await req.prisma.meetingFile.delete({ where: { id: file.id } });
        const localPath = path.join(meetingsUploadDir, path.basename(file.fileUrl || ''));
        try {
            if (localPath && fs.existsSync(localPath)) fs.unlinkSync(localPath);
        } catch {}

        await createAuditLog(req, 'MEETING_FILE_DELETED', 'MeetingFile', file.id, `Fichier "${file.fileName}" supprimé`);
        res.json({ success: true });
    } catch (error) {
        logger.error('MEETING_FILE_DELETE', error.message, { meetingId: req.params.id, fileId: req.params.fileId });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings/{id}/attachment:
 *   post:
 *     summary: Joindre un PDF à la réunion (organisateur ou admin)
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Fichier joint (attachmentUrl dans la réponse)
 *       403:
 *         description: Non autorisé
 */
router.post('/:id/attachment', wrapMulterUpload(uploadMeetingFile.single('file')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier envoyé. Utilisez le champ "file".' });
        }
        const meeting = await req.prisma.meeting.findUnique({ where: { id: req.params.id } });
        if (!meeting) return res.status(404).json({ error: 'Réunion introuvable' });
        const isOrganizer = meeting.organizerId === req.user.id;
        const isAdmin = isPrivilegedAdmin(req.user.role);
        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ error: 'Seul l\'organisateur ou un administrateur peut joindre un fichier.' });
        }
        const attachmentUrl = `/uploads/meetings/${req.file.filename}`;
        await req.prisma.meeting.update({
            where: { id: req.params.id },
            data: { attachments: attachmentUrl },
        });
        res.json({ attachmentUrl });
    } catch (error) {
        logger.error('MEETING_ATTACHMENT', error.message, { meetingId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings/{id}:
 *   put:
 *     summary: Modifier une réunion (organisateur). En cas de changement d'horaire/salle, envoi d'un email aux invités.
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
    try {
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: {
                invitations: { include: { user: true } },
                room: true,
            },
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Réunion introuvable' });
        }

        if (!canEditMeeting(meeting, req.user)) {
            if (!canManageMeeting(meeting, req.user)) {
                return res.status(403).json({ error: 'Seul l\'organisateur ou un administrateur peut modifier cette réunion' });
            }
            return res.status(400).json({ error: 'Réunion finalisée : modification impossible.' });
        }

        const { title, agenda, roomId, meetingLink, startTime, endTime, directionId, projectId, eventTypeId } = req.body;
        const newStart = startTime ? new Date(startTime) : meeting.startTime;
        const newEnd = endTime ? new Date(endTime) : meeting.endTime;
        const hasMeetingLinkInPayload = meetingLink !== undefined;
        const normalizedMeetingLink = hasMeetingLinkInPayload ? normalizeMeetingLink(meetingLink) : meeting.meetingLink;

        if (newStart >= newEnd) {
            return res.status(400).json({ error: 'L\'heure de fin doit être après l\'heure de début' });
        }

        const timeOrRoomChanged =
            newStart.getTime() !== new Date(meeting.startTime).getTime() ||
            newEnd.getTime() !== new Date(meeting.endTime).getTime() ||
            String(roomId || '') !== String(meeting.roomId || '');
        const meetingLinkChanged =
            (hasMeetingLinkInPayload
                ? String(normalizedMeetingLink || '')
                : String(meeting.meetingLink || '')) !== String(meeting.meetingLink || '');

        const newRoomId = roomId !== undefined ? (roomId || null) : meeting.roomId;
        if (!newRoomId && !normalizedMeetingLink) {
            return res.status(400).json({ error: 'Renseignez une salle ou un lien de visioconférence.' });
        }
        if (hasMeetingLinkInPayload && String(meetingLink || '').trim() && !normalizedMeetingLink) {
            return res.status(400).json({ error: 'Lien de visioconférence invalide (http/https requis).' });
        }

        if (newRoomId) {
            const active = await isRoomActive(req.prisma, newRoomId);
            if (!active) {
                return res.status(410).json({
                    error: 'Cette salle est désactivée. Choisissez une autre salle active.',
                });
            }
        }

        if (newRoomId) {
            const available = await isRoomAvailableForSlot(
                req.prisma,
                newRoomId,
                newStart,
                newEnd,
                meeting.id
            );
            if (!available) {
                return res.status(409).json({
                    error: 'Cette salle n\'est pas libre sur le créneau choisi.',
                });
            }
        }

        if (directionId !== undefined) {
            if (directionId) {
                const d = await req.prisma.direction.findUnique({ where: { id: directionId }, select: { id: true } });
                if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
            }
        }
        let resolvedProjectIdForUpdate;
        if (projectId !== undefined) {
            const projectCheck = await validateProjectForUserAction(
                req.prisma,
                req.user,
                projectId || null,
                { requiredForResponsable: false },
            );
            if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
            resolvedProjectIdForUpdate = projectCheck.value;
        } else if (isResponsable(req.user?.role) && meeting.projectId) {
            const projectCheck = await validateProjectForUserAction(req.prisma, req.user, meeting.projectId);
            if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
        }

        let eventTypeIdData = undefined;
        if (Object.prototype.hasOwnProperty.call(req.body, 'eventTypeId')) {
            try {
                eventTypeIdData = await resolveMeetingEventTypeId(req.prisma, req.body.eventTypeId);
            } catch (e) {
                return res.status(400).json({ error: e.message });
            }
        }

        const updated = await req.prisma.meeting.update({
            where: { id: req.params.id },
            data: {
                ...(title !== undefined && { title }),
                ...(agenda !== undefined && { agenda }),
                ...(roomId !== undefined && { roomId: newRoomId }),
                ...(directionId !== undefined && { directionId: directionId || null }),
                ...(projectId !== undefined && { projectId: resolvedProjectIdForUpdate ?? null }),
                ...(hasMeetingLinkInPayload && { meetingLink: normalizedMeetingLink }),
                ...(startTime !== undefined && { startTime: newStart }),
                ...(endTime !== undefined && { endTime: newEnd }),
                ...(eventTypeIdData !== undefined && { eventTypeId: eventTypeIdData }),
            },
            include: {
                organizer: { select: { name: true, email: true } },
                room: true,
                direction: { select: { id: true, name: true, code: true } },
                project: { select: { ...PROJECT_WITH_RESPONSIBLE_SELECT, consolidatorId: true, coordinatorId: true } },
                eventType: EVENT_TYPE_INCLUDE,
                invitations: { include: { user: true } },
            },
        });

        const existingBooking = await req.prisma.roomBooking.findUnique({
            where: { meetingId: meeting.id },
        });

        if (['SENT', 'CONFIRMED'].includes(meeting.status) && (existingBooking || newRoomId)) {
            const dateForBooking = appDayBoundsFromYmd(toAppYmd(updated.startTime)).start;
            const startStr = formatAppTimeHm(updated.startTime);
            const endStr = formatAppTimeHm(updated.endTime);

            if (existingBooking) {
                await req.prisma.roomBooking.updateMany({
                    where: { meetingId: meeting.id },
                    data: {
                        roomId: newRoomId || existingBooking.roomId,
                        date: dateForBooking,
                        startTime: startStr,
                        endTime: endStr,
                    },
                });
            } else if (newRoomId) {
                await req.prisma.roomBooking.create({
                    data: {
                        roomId: newRoomId,
                        meetingId: meeting.id,
                        userId: req.user.id,
                        date: dateForBooking,
                        startTime: startStr,
                        endTime: endStr,
                    },
                });
            }
        }

        if ((timeOrRoomChanged || meetingLinkChanged) && ['SENT', 'CONFIRMED'].includes(meeting.status) && meeting.invitations?.length > 0) {
            const channelText = updated.meetingLink
                ? `Salle: ${updated.room?.name || '—'} · Visio: disponible`
                : `Salle: ${updated.room?.name || '—'}`;
            for (const inv of meeting.invitations) {
                await notificationService.sendFullNotification(
                    req.prisma,
                    inv.user.id,
                    inv.user.email,
                    'MEETING_SCHEDULE_UPDATED',
                    'MEETING_SCHEDULE_UPDATED',
                    [inv.user, updated, updated.room],
                    `Modification : ${updated.title}`,
                    `La réunion "${updated.title}" a été mise à jour. ${channelText}`,
                    `/meetings/${updated.id}`
                );
            }
        }

        await createAuditLog(
            req,
            'MEETING_UPDATED',
            'Meeting',
            req.params.id,
            `Réunion "${updated.title}" modifiée` + (timeOrRoomChanged ? ' (horaire/salle)' : '')
        );

        try {
            if (updated.status === 'DRAFT') {
                const organizer = await req.prisma.user.findUnique({
                    where: { id: updated.organizerId },
                    select: { id: true, name: true, email: true, role: true },
                });
                const contentChanged = title !== undefined
                    || agenda !== undefined
                    || timeOrRoomChanged
                    || meetingLinkChanged
                    || projectId !== undefined;
                if (contentChanged && requiresConsolidatorApproval(organizer?.role)) {
                    await notifyConsolidatorsPendingMeeting(req.prisma, updated, organizer);
                }
            }
        } catch (notifyErr) {
            logger.warn('MEETING_CONSOLIDATOR_NOTIFY_FAILED', notifyErr.message, { meetingId: updated.id });
        }

        res.json(updated);
    } catch (error) {
        logger.error('UPDATE_MEETING', 'Erreur modification réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings:
 *   post:
 *     summary: Créer une nouvelle réunion
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, agenda, startTime, endTime, participants]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Réunion de direction
 *               agenda:
 *                 type: string
 *                 example: Point mensuel sur les projets
 *               roomId:
 *                 type: string
 *                 nullable: true
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Liste des IDs des participants
 *     responses:
 *       200:
 *         description: Réunion créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Meeting'
 *       409:
 *         description: Conflit de réservation de salle
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', async (req, res) => {
    try {
        const { title, agenda, roomId, meetingLink, startTime, endTime, participants, participantIds, directionId, projectId } = req.body;
        const participantListRaw = Array.isArray(participants)
            ? participants
            : Array.isArray(participantIds)
              ? participantIds
              : [];
        const participantList = [...new Set(participantListRaw.filter(Boolean))];
        const normalizedMeetingLink = normalizeMeetingLink(meetingLink);

        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
            return res.status(400).json({ error: 'L\'heure de fin doit être après l\'heure de début' });
        }
        if (!roomId && !normalizedMeetingLink) {
            return res.status(400).json({ error: 'Renseignez une salle ou un lien de visioconférence.' });
        }
        if (String(meetingLink || '').trim() && !normalizedMeetingLink) {
            return res.status(400).json({ error: 'Lien de visioconférence invalide (http/https requis).' });
        }

        // Réunion sur une salle libre : salle doit être ACTIVE
        if (roomId) {
            const active = await isRoomActive(req.prisma, roomId);
            if (!active) {
                return res.status(410).json({
                    error: 'Cette salle est désactivée. Aucune réunion ne peut y être planifiée tant qu\'elle n\'est pas réactivée.',
                });
            }
        }

        // Réunion sur une salle libre : vérifier que le créneau est libre
        if (roomId) {
            const available = await isRoomAvailableForSlot(req.prisma, roomId, start, end);
            if (!available) {
                return res.status(409).json({
                    error: 'Cette salle n\'est pas libre sur le créneau choisi. Choisissez une autre salle ou un autre horaire.',
                });
            }
        }

        if (directionId) {
            const d = await req.prisma.direction.findUnique({ where: { id: directionId }, select: { id: true } });
            if (!d) return res.status(400).json({ error: 'Direction introuvable.' });
        }

        let resolvedEventTypeId = undefined;
        if (Object.prototype.hasOwnProperty.call(req.body, 'eventTypeId')) {
            try {
                resolvedEventTypeId = await resolveMeetingEventTypeId(req.prisma, req.body.eventTypeId);
            } catch (e) {
                return res.status(400).json({ error: e.message });
            }
        }

        let effectiveProjectId;
        if (isResponsable(req.user?.role)) {
            const projectCheck = await validateProjectForUserAction(req.prisma, req.user, projectId || null);
            if (!projectCheck.ok) return res.status(403).json({ error: projectCheck.error });
            effectiveProjectId = projectCheck.value;
        } else {
            if (projectId) {
                const projectCheck = await validateProjectForUserAction(req.prisma, req.user, projectId);
                if (!projectCheck.ok) return res.status(400).json({ error: projectCheck.error });
            }
            effectiveProjectId = projectId
                || await resolveProjectIdForConsolidation(req.prisma, null, req.user.id);
        }

        const meeting = await req.prisma.meeting.create({
            data: {
                title,
                agenda: agenda || '',
                organizerId: req.user.id,
                roomId: roomId || null,
                directionId: directionId || null,
                projectId: effectiveProjectId || null,
                meetingLink: normalizedMeetingLink,
                startTime: start,
                endTime: end,
                status: 'DRAFT',
                ...(resolvedEventTypeId !== undefined && { eventTypeId: resolvedEventTypeId }),
                invitations: {
                    create: participantList.map((userId) => ({ userId, status: 'PENDING' })),
                },
            },
            include: { invitations: true, eventType: EVENT_TYPE_INCLUDE },
        });

        logger.info('MEETING_CREATED', `Réunion créée par ${req.user.name}`, {
            meetingId: meeting.id,
            organizerId: req.user.id,
            title,
        });

        await createAuditLog(req, 'MEETING_CREATED', 'Meeting', meeting.id, `Réunion "${title}" créée`);

        try {
            const organizer = await req.prisma.user.findUnique({
                where: { id: req.user.id },
                select: { id: true, name: true, email: true, role: true },
            });
            const room = roomId
                ? await req.prisma.room.findUnique({ where: { id: roomId }, select: { name: true } })
                : null;
            if (requiresConsolidatorApproval(organizer?.role)) {
                await notifyConsolidatorsPendingMeeting(req.prisma, meeting, organizer);
            }
            if (organizer?.email) {
                const pendingMsg = requiresConsolidatorApproval(organizer.role)
                    ? 'Statut : brouillon — en attente de validation par le consolidateur.'
                    : 'Statut : brouillon — pensez à envoyer les convocations depuis la fiche réunion.';
                await notificationService.sendFullNotification(
                    req.prisma,
                    organizer.id,
                    organizer.email,
                    'MEETING_CREATED_CONFIRMATION',
                    'MEETING_CREATED_CONFIRMATION',
                    [organizer, meeting, room, participantList.length, pendingMsg],
                    'Réunion créée',
                    `Votre réunion « ${meeting.title} » a été enregistrée.`,
                    `/meetings/${meeting.id}`,
                );
            }
        } catch (notifyErr) {
            logger.warn('MEETING_CREATOR_NOTIFY_FAILED', notifyErr.message, { meetingId: meeting.id });
        }

        res.json(meeting);
    } catch (error) {
        logger.error('CREATE_MEETING', 'Erreur création réunion', {
            userId: req.user.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings/{id}/send:
 *   put:
 *     summary: Envoyer les convocations aux participants
 *     tags: [Meetings]
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
 *         description: Convocations envoyées avec succès
 *       403:
 *         description: Non autorisé (seul l'organisateur peut envoyer)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/:id/send', async (req, res) => {
    try {
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: {
                organizer: { select: { id: true, name: true, role: true } },
                invitations: { include: { user: true } },
                room: true,
            },
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Réunion introuvable' });
        }
        if (meeting.status === 'CANCELLED' || meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Réunion finalisée : publication impossible.' });
        }
        if (!canPublishMeeting(meeting, req.user)) {
            if (requiresConsolidatorApproval(meeting.organizer?.role)) {
                return res.status(403).json({
                    error: 'Cette réunion doit être validée par un consolidateur avant d\'apparaître sur le calendrier.',
                });
            }
            return res.status(403).json({ error: 'Seul l\'organisateur peut envoyer les convocations.' });
        }

        const updated = await publishMeeting(req, meeting);
        res.json(updated);
    } catch (error) {
        logger.error('SEND_MEETING', 'Erreur publication réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

async function notifyOrganizerMeetingProgress(req, meeting, stage) {
    if (!meeting.organizer?.email) return;
    const isConsolidated = stage === 'consolidated';
    const notifType = isConsolidated ? 'MEETING_CONSOLIDATED' : 'MEETING_PUBLISHED';
    const emailTemplate = isConsolidated ? 'MEETING_CONSOLIDATED' : 'MEETING_PUBLISHED';
    const inAppTitle = isConsolidated
        ? `Réunion consolidée : ${meeting.title}`
        : `Réunion publiée : ${meeting.title}`;
    const inAppBody = isConsolidated
        ? `Votre réunion a été consolidée par ${req.user.name}. Elle attend la validation finale avant publication.`
        : `Votre réunion a été validée par ${req.user.name} et publiée sur le calendrier. Les convocations ont été envoyées.`;
    try {
        await notificationService.sendFullNotification(
            req.prisma,
            meeting.organizer.id,
            meeting.organizer.email,
            notifType,
            emailTemplate,
            [meeting.organizer, meeting, meeting.room, req.user],
            inAppTitle,
            inAppBody,
            `/meetings/${meeting.id}`,
        );
    } catch (notifyErr) {
        logger.warn('MEETING_NOTIFY_FAILED', notifyErr.message, { meetingId: meeting.id, stage });
    }
}

/** 1er palier : consolidation (sans publication) ou validation directe si pas de consolidateur projet. */
router.put('/:id/approve', async (req, res) => {
    try {
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: {
                organizer: { select: { id: true, name: true, email: true, role: true } },
                project: { select: { id: true, name: true, consolidatorId: true, coordinatorId: true } },
                invitations: { include: { user: true } },
                room: true,
            },
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Réunion introuvable' });
        }
        if (meeting.status !== 'DRAFT') {
            return res.status(400).json({ error: 'Seules les réunions en brouillon peuvent être traitées à cette étape.' });
        }

        if (isPrivilegedAdmin(req.user.role)) {
            const updated = await publishMeeting(req, meeting);
            await notifyOrganizerMeetingProgress(req, meeting, 'published');
            await createAuditLog(req, 'MEETING_APPROVED', 'Meeting', meeting.id, `Réunion « ${meeting.title} » publiée (admin)`);
            return res.json(updated);
        }

        if (canConsolidateDraftMeeting(meeting, req.user)) {
            const updated = await req.prisma.meeting.update({
                where: { id: meeting.id },
                data: { status: MEETING_PENDING_FINAL },
            });
            await notifyMeetingPendingFinalApproval(req.prisma, meeting, meeting.organizer);
            await notifyOrganizerMeetingProgress(req, meeting, 'consolidated');
            await createAuditLog(
                req,
                'MEETING_CONSOLIDATED',
                'Meeting',
                meeting.id,
                `Réunion « ${meeting.title} » consolidée — attente validation finale`,
            );
            return res.json(updated);
        }

        if (!canApproveDraftMeeting(meeting, req.user)) {
            return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider cette réunion.' });
        }

        const updated = await publishMeeting(req, meeting);
        await notifyOrganizerMeetingProgress(req, meeting, 'published');
        await createAuditLog(req, 'MEETING_APPROVED', 'Meeting', meeting.id, `Réunion « ${meeting.title} » validée et publiée`);
        res.json(updated);
    } catch (error) {
        logger.error('APPROVE_MEETING', 'Erreur validation réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

/** 2e palier : validation finale (coordinateur ou rôle dédié) → publication. */
router.put('/:id/approve-coordinator', async (req, res) => {
    try {
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: {
                organizer: { select: { id: true, name: true, email: true, role: true } },
                project: { select: { id: true, name: true, consolidatorId: true, coordinatorId: true } },
                invitations: { include: { user: true } },
                room: true,
            },
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Réunion introuvable' });
        }
        if (!isPendingCoordinatorValidation(meeting.status)) {
            return res.status(400).json({ error: 'Cette réunion n\'est pas en attente de validation finale.' });
        }
        if (!canFinalizePendingMeeting(meeting, req.user) && !isPrivilegedAdmin(req.user.role)) {
            return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à valider définitivement cette réunion.' });
        }

        const updated = await publishMeeting(req, meeting);
        await notifyOrganizerMeetingProgress(req, meeting, 'published');
        await createAuditLog(
            req,
            'MEETING_APPROVED',
            'Meeting',
            meeting.id,
            `Réunion « ${meeting.title} » validée définitivement et publiée`,
        );
        res.json(updated);
    } catch (error) {
        logger.error('APPROVE_MEETING_COORDINATOR', 'Erreur validation finale réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings/{id}/cancel:
 *   put:
 *     summary: Annuler une réunion
 *     tags: [Meetings]
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
 *         description: Réunion annulée
 *       403:
 *         description: Non autorisé
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/:id/cancel', async (req, res) => {
    try {
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: { invitations: { include: { user: true } } },
        });
        if (!meeting) return res.status(404).json({ error: 'Réunion introuvable' });

        const canManage = meeting.organizerId === req.user.id || isPrivilegedAdmin(req.user.role);
        if (!canManage) {
            return res.status(403).json({ error: 'Seul l’organisateur ou un administrateur peut annuler cette réunion.' });
        }
        if (meeting.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Cette réunion est déjà annulée.' });
        }
        if (meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Impossible d’annuler une réunion déjà terminée.' });
        }

        const updated = await req.prisma.meeting.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
        });

        await req.prisma.roomBooking.updateMany({
            where: { meetingId: req.params.id },
            data: { status: 'CANCELLED' },
        });

        // Notify all participants
        const participantIds = meeting.invitations.map((inv) => inv.userId);
        if (participantIds.length > 0) {
            await notificationService.sendBulkNotification(
                req.prisma,
                participantIds,
                'MEETING_CANCELLED',
                `Réunion annulée : ${meeting.title}`,
                `La réunion du ${new Date(meeting.startTime).toLocaleDateString('fr-FR')} a été annulée`,
                `/meetings`
            );
        }

        logger.info('MEETING_CANCELLED', `Réunion "${meeting.title}" annulée`, {
            meetingId: req.params.id,
            organizerId: req.user.id,
        });

        await createAuditLog(req, 'MEETING_CANCELLED', 'Meeting', req.params.id, `Réunion "${meeting.title}" annulée`);

        res.json(updated);
    } catch (error) {
        logger.error('CANCEL_MEETING', 'Erreur annulation réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/meetings/:id/complete
 * Marquer une réunion comme terminée (organisateur ou admin).
 */
router.put('/:id/complete', async (req, res) => {
    try {
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: { invitations: true },
        });
        if (!meeting) return res.status(404).json({ error: 'Réunion introuvable' });

        const canManage = meeting.organizerId === req.user.id || isPrivilegedAdmin(req.user.role);
        if (!canManage) {
            return res.status(403).json({ error: 'Seul l’organisateur ou un administrateur peut terminer cette réunion.' });
        }
        if (meeting.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Impossible de terminer une réunion annulée.' });
        }
        if (meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Cette réunion est déjà terminée.' });
        }

        const updated = await req.prisma.meeting.update({
            where: { id: req.params.id },
            data: { status: 'COMPLETED' },
        });

        // Libérer explicitement les réservations liées
        await req.prisma.roomBooking.updateMany({
            where: { meetingId: req.params.id, status: 'CONFIRMED' },
            data: { status: 'CANCELLED' },
        });

        const participantIds = meeting.invitations.map((inv) => inv.userId);
        if (participantIds.length > 0) {
            await notificationService.sendBulkNotification(
                req.prisma,
                participantIds,
                'MEETING_COMPLETED',
                `Réunion terminée : ${meeting.title}`,
                `La réunion "${meeting.title}" a été marquée comme terminée.`,
                `/meetings/${meeting.id}`
            );
        }

        await createAuditLog(req, 'MEETING_COMPLETED', 'Meeting', req.params.id, `Réunion "${meeting.title}" terminée`);
        return res.json(updated);
    } catch (error) {
        logger.error('COMPLETE_MEETING', 'Erreur fin de réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        return res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/meetings/:id/reopen
 * Rouvrir une réunion fermée automatiquement/manuellement.
 */
router.put('/:id/reopen', async (req, res) => {
    try {
        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: { invitations: true },
        });
        if (!meeting) return res.status(404).json({ error: 'Réunion introuvable' });
        if (!canReopenMeeting(meeting, req.user)) {
            return res.status(403).json({ error: 'Seul un admin, un responsable ou le créateur peut rouvrir cette réunion.' });
        }
        if (meeting.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Seules les réunions terminées peuvent être rouvertes.' });
        }

        // Si la fin est déjà passée, on prolonge de 30 min pour éviter une refermeture immédiate.
        const now = new Date();
        const endTime = new Date(meeting.endTime);
        const adjustedEnd = endTime < now ? new Date(now.getTime() + 30 * 60 * 1000) : endTime;
        const nextStatus = (meeting.invitations?.length || 0) > 0 ? 'CONFIRMED' : 'DRAFT';

        const updated = await req.prisma.meeting.update({
            where: { id: meeting.id },
            data: {
                status: nextStatus,
                endTime: adjustedEnd,
            },
        });

        await createAuditLog(
            req,
            'MEETING_REOPENED',
            'Meeting',
            meeting.id,
            `Réunion "${meeting.title}" rouverte (statut ${nextStatus})`
        );
        return res.json(updated);
    } catch (error) {
        logger.error('REOPEN_MEETING', 'Erreur réouverture réunion', {
            meetingId: req.params.id,
            error: error.message,
        });
        return res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings/invitations/{id}/respond:
 *   post:
 *     summary: Répondre à une invitation (accepter/décliner)
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'invitation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, DECLINED]
 *     responses:
 *       200:
 *         description: Réponse enregistrée
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/invitations/:id/respond', async (req, res) => {
    try {
        const { status } = req.body;

        const updated = await req.prisma.invitation.update({
            where: { id: req.params.id },
            data: { status, respondedAt: new Date() },
            include: { meeting: { include: { organizer: true } } },
        });

        logger.info('INVITATION_RESPONDED', `Invitation ${req.params.id} - réponse: ${status}`, {
            invitationId: req.params.id,
            userId: req.user.id,
            status,
        });

        // Notify organizer of the response
        const responderName = req.user?.name || req.user?.email || 'Un participant';
        const responderEmail = req.user?.email ? ` (${req.user.email})` : '';
        const statusLabel = status === 'ACCEPTED' ? 'accepté' : 'décliné';
        await notificationService.createNotification(
            req.prisma,
            updated.meeting.organizerId,
            'MEETING_CONVOCATION',
            `Réponse de ${responderName}`,
            `${responderName}${responderEmail} a ${statusLabel} votre réunion "${updated.meeting.title}"`,
            `/meetings/${updated.meeting.id}`
        );

        res.json(updated);
    } catch (error) {
        logger.error('RESPOND_INVITATION', 'Erreur réponse invitation', {
            invitationId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/meetings/{id}/participants:
 *   post:
 *     summary: Ajouter des participants à une réunion existante
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Liste des IDs des utilisateurs à ajouter
 *     responses:
 *       200:
 *         description: Participants ajoutés
 */
router.post('/:id/participants', async (req, res) => {
    try {
        const { userIds } = req.body || {};
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'Liste userIds requise' });
        }

        const meeting = await req.prisma.meeting.findUnique({
            where: { id: req.params.id },
            include: {
                invitations: true,
                room: true,
            },
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Réunion introuvable' });
        }

        if (meeting.organizerId !== req.user.id && !isPrivilegedAdmin(req.user.role)) {
            return res.status(403).json({ error: 'Seul l\'organisateur ou un admin peut ajouter des participants' });
        }

        if (meeting.status === 'CANCELLED' || meeting.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Impossible d\'ajouter des participants à une réunion finalisée' });
        }

        const existingIds = new Set(meeting.invitations.map((inv) => inv.userId));
        const toAdd = userIds.filter((uid) => uid && !existingIds.has(uid) && uid !== meeting.organizerId);

        if (toAdd.length === 0) {
            return res.status(400).json({ error: 'Aucun nouveau participant à ajouter' });
        }

        await req.prisma.invitation.createMany({
            data: toAdd.map((uid) => ({
                meetingId: meeting.id,
                userId: uid,
                status: 'PENDING',
            })),
        });

        // Si la réunion est déjà validée/publiée, notifier immédiatement les nouveaux participants
        if (['SENT', 'CONFIRMED'].includes(meeting.status)) {
            const newUsers = await req.prisma.user.findMany({
                where: { id: { in: toAdd } },
            });

            for (const u of newUsers) {
                const inv = await req.prisma.invitation.findUnique({
                    where: { meetingId_userId: { meetingId: meeting.id, userId: u.id } },
                }).catch(() => null);
                const acceptUrl = inv ? buildInvitationActionUrl(req, inv.id, 'ACCEPTED') : null;
                const declineUrl = inv ? buildInvitationActionUrl(req, inv.id, 'DECLINED') : null;
                await notificationService.sendFullNotification(
                    req.prisma,
                    u.id,
                    u.email,
                    'MEETING_CONVOCATION',
                    'MEETING_CONVOCATION',
                    [u, meeting, meeting.room, { acceptUrl, declineUrl }],
                    `Convocation : ${meeting.title}`,
                    `Vous êtes convoqué(e) le ${new Date(meeting.startTime).toLocaleDateString('fr-FR')} (${meeting.meetingLink ? 'Visio disponible' : `Salle: ${meeting.room?.name || '—'}`})`,
                    `/meetings`
                );
            }
        }

        await createAuditLog(req, 'MEETING_PARTICIPANTS_ADDED', 'Meeting', meeting.id, `${toAdd.length} participant(s) ajouté(s)`);

        res.json({ success: true, added: toAdd.length });
    } catch (error) {
        logger.error('ADD_MEETING_PARTICIPANTS', 'Erreur ajout participants', {
            meetingId: req.params.id,
            error: error.message,
        });
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/meetings/:id — Suppression définitive (super administrateur uniquement)
 */
router.delete('/:id', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) {
            return res.status(403).json({ error: 'Suppression définitive réservée aux administrateurs.' });
        }
        const meeting = await req.prisma.meeting.findUnique({ where: { id: req.params.id } });
        if (!meeting) return res.status(404).json({ error: 'Réunion introuvable' });

        await req.prisma.$transaction([
            req.prisma.roomBooking.deleteMany({ where: { meetingId: meeting.id } }),
            req.prisma.meeting.delete({ where: { id: meeting.id } }),
        ]);

        await createAuditLog(req, 'MEETING_DELETED', 'Meeting', meeting.id, `Réunion "${meeting.title}" supprimée définitivement`);

        logger.info('MEETING_DELETED', `Réunion supprimée par super admin ${req.user.id}`, {
            meetingId: meeting.id,
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('DELETE_MEETING', error.message, { meetingId: req.params.id });
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
