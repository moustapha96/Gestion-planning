const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ROLES, isPrivilegedAdmin, normalizeStoredRole } = require('../config/roles');
const {
    DIRECTOR_PENDING_STATUS,
    DIRECTOR_APPROVED_STATUS,
    DIRECTOR_AUTO_APPROVED_STATUS,
    DIRECTOR_REJECTED_STATUS,
    ATTACHMENT_ERRORS,
} = require('../config/directorWorkflow');
const { getDirectorForDirection } = require('./directorAttachment.service');
const { notificationService } = require('./notification.service');
const { logger } = require('../utils/logger');

const TOKEN_PURPOSE = 'director_approval';
const TOKEN_TTL = process.env.DIRECTOR_APPROVAL_TOKEN_EXPIRY || '7d';

function frontendBase() {
    return String(process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
}

function signApprovalToken({ entityType, entityId, directorId, action }) {
    return jwt.sign(
        {
            purpose: TOKEN_PURPOSE,
            entityType,
            entityId,
            directorId,
            action,
            jti: crypto.randomUUID(),
        },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_TTL },
    );
}

function verifyApprovalToken(token) {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== TOKEN_PURPOSE) {
        const err = new Error('Jeton de validation invalide.');
        err.statusCode = 400;
        throw err;
    }
    return payload;
}

function buildEmailActionUrls(entityType, entityId, directorId) {
    const approveToken = signApprovalToken({ entityType, entityId, directorId, action: 'approve' });
    const rejectToken = signApprovalToken({ entityType, entityId, directorId, action: 'reject' });
    const base = frontendBase();
    return {
        approveUrl: `${base}/director-approval?token=${encodeURIComponent(approveToken)}&action=approve`,
        rejectUrl: `${base}/director-approval?token=${encodeURIComponent(rejectToken)}&action=reject`,
        appUrl: `${base}/a-valider`,
    };
}

function canActorApprove(actor, request) {
    if (!actor?.id || !request) return { ok: false, error: ATTACHMENT_ERRORS.ACCESS_DENIED };
    if (request.createdById === actor.id || request.organizerId === actor.id) {
        return { ok: false, error: ATTACHMENT_ERRORS.CANNOT_SELF_APPROVE };
    }
    if (isPrivilegedAdmin(actor.role)) return { ok: true, asAdmin: true };
    const { isEligibleDirectionDirector } = require('../config/directorWorkflow');
    if (!isEligibleDirectionDirector(actor)) {
        return { ok: false, error: ATTACHMENT_ERRORS.ACCESS_DENIED };
    }
    if (!actor.directionId || actor.directionId !== request.directionId) {
        return { ok: false, error: ATTACHMENT_ERRORS.NOT_DG_OF_DIRECTION };
    }
    return { ok: true, asAdmin: false };
}

async function writeAudit(prisma, { userId, action, entity, entityId, details }) {
    await prisma.auditLog.create({
        data: {
            userId: userId || null,
            action,
            entity,
            entityId: String(entityId),
            details: details || null,
        },
    });
}

async function loadMeeting(prisma, id) {
    return prisma.meeting.findUnique({
        where: { id },
        include: {
            organizer: { select: { id: true, name: true, email: true, role: true, directionId: true } },
            direction: { select: { id: true, name: true, directorId: true } },
            room: { select: { id: true, name: true, location: true } },
            invitations: {
                include: { user: { select: { id: true, name: true, email: true } } },
            },
            project: { select: { id: true, name: true } },
        },
    });
}

async function loadMission(prisma, id) {
    return prisma.mission.findUnique({
        where: { id },
        include: {
            createdBy: { select: { id: true, name: true, email: true, role: true, directionId: true } },
            direction: { select: { id: true, name: true, directorId: true } },
            assignments: {
                include: { user: { select: { id: true, name: true, email: true } } },
            },
            project: { select: { id: true, name: true } },
        },
    });
}

async function notifyDirectorPending(prisma, { entityType, entity, creator, director, direction }) {
    const urls = buildEmailActionUrls(entityType, entity.id, director.id);
    const template = entityType === 'meeting' ? 'MEETING_PENDING_DIRECTOR' : 'MISSION_PENDING_DIRECTOR';
    const title = entityType === 'meeting'
        ? `Réunion à valider : ${entity.title}`
        : `Mission à valider : ${entity.title}`;
    const body = `${creator?.name || 'Un Assistant'} a soumis une demande pour la direction ${direction?.name || ''}.`;
    try {
        await notificationService.sendFullNotification(
            prisma,
            director.id,
            director.email,
            template,
            template,
            [director, entity, creator, direction, urls],
            title,
            body,
            '/a-valider',
        );
    } catch (err) {
        logger.warn('DIRECTOR_PENDING_NOTIFY_FAILED', err.message, {
            entityType,
            entityId: entity.id,
            directorId: director.id,
        });
    }
}

async function notifyAssistantDecision(prisma, { entityType, entity, assistant, approved, reason, actor }) {
    const template = approved
        ? (entityType === 'meeting' ? 'MEETING_DIRECTOR_APPROVED' : 'MISSION_DIRECTOR_APPROVED')
        : (entityType === 'meeting' ? 'MEETING_DIRECTOR_REJECTED' : 'MISSION_DIRECTOR_REJECTED');
    const title = approved
        ? `${entityType === 'meeting' ? 'Réunion' : 'Mission'} validée : ${entity.title}`
        : `${entityType === 'meeting' ? 'Réunion' : 'Mission'} refusée : ${entity.title}`;
    const body = approved
        ? `${actor?.name || 'Le DG'} a validé votre demande.`
        : `${actor?.name || 'Le DG'} a refusé votre demande${reason ? ` : ${reason}` : '.'}`;
    const link = entityType === 'meeting' ? `/meetings/${entity.id}` : `/missions/${entity.id}`;
    if (!assistant?.id) return;
    try {
        await notificationService.sendFullNotification(
            prisma,
            assistant.id,
            assistant.email,
            template,
            template,
            [assistant, entity, actor, reason || null],
            title,
            body,
            link,
        );
    } catch (err) {
        logger.warn('ASSISTANT_DECISION_NOTIFY_FAILED', err.message, {
            entityType,
            entityId: entity.id,
        });
    }
}

/**
 * Décide le statut initial pour une création Assistant.
 * Autres rôles : retourne null (le flux existant s'applique).
 */
async function resolveAssistantCreation(prisma, user, requestedDirectionId) {
    const role = normalizeStoredRole(user?.role);
    if (role !== ROLES.ASSISTANT) return null;

    const directionId = user.directionId || requestedDirectionId || null;
    if (!directionId) {
        const err = new Error('Un Assistant doit être rattaché à une direction pour créer une mission ou une réunion.');
        err.statusCode = 400;
        throw err;
    }
    if (requestedDirectionId && requestedDirectionId !== directionId) {
        const err = new Error('Un Assistant ne peut créer que pour sa propre direction.');
        err.statusCode = 403;
        throw err;
    }

    const found = await getDirectorForDirection(prisma, directionId);
    if (found?.director) {
        return {
            status: DIRECTOR_PENDING_STATUS,
            directionId,
            createdByRole: ROLES.ASSISTANT,
            director: found.director,
            direction: found.direction,
            autoApproved: false,
        };
    }
    return {
        status: DIRECTOR_AUTO_APPROVED_STATUS,
        directionId,
        createdByRole: ROLES.ASSISTANT,
        director: null,
        direction: found?.direction || { id: directionId },
        autoApproved: true,
    };
}

async function afterAssistantCreated(prisma, {
    entityType,
    entity,
    creator,
    resolution,
}) {
    if (!resolution) return;
    if (resolution.autoApproved) {
        await writeAudit(prisma, {
            userId: creator?.id,
            action: entityType === 'meeting' ? 'MEETING_AUTO_APPROVED' : 'MISSION_AUTO_APPROVED',
            entity: entityType === 'meeting' ? 'Meeting' : 'Mission',
            entityId: entity.id,
            details: `Auto-validée : aucun DG sur la direction ${resolution.directionId}`,
        });
        return;
    }
    await writeAudit(prisma, {
        userId: creator?.id,
        action: entityType === 'meeting' ? 'MEETING_SUBMITTED' : 'MISSION_SUBMITTED',
        entity: entityType === 'meeting' ? 'Meeting' : 'Mission',
        entityId: entity.id,
        details: `Soumise au DG ${resolution.director?.name || ''} (${resolution.directionId})`,
    });
    await notifyDirectorPending(prisma, {
        entityType,
        entity,
        creator,
        director: resolution.director,
        direction: resolution.direction,
    });
}

async function approveRequest(prisma, { entityType, entityId, actor, tokenPayload }) {
    const entity = entityType === 'meeting'
        ? await loadMeeting(prisma, entityId)
        : await loadMission(prisma, entityId);
    if (!entity) {
        const err = new Error(entityType === 'meeting' ? 'Réunion introuvable.' : 'Mission introuvable.');
        err.statusCode = 404;
        throw err;
    }
    if (entity.status !== DIRECTOR_PENDING_STATUS) {
        const err = new Error('Cette demande n\'est plus en attente de validation du DG.');
        err.statusCode = 409;
        throw err;
    }

    let actingUser = actor;
    if (tokenPayload) {
        if (tokenPayload.entityId !== entityId || tokenPayload.entityType !== entityType) {
            const err = new Error('Jeton ne correspondant pas à cette demande.');
            err.statusCode = 400;
            throw err;
        }
        actingUser = await prisma.user.findUnique({ where: { id: tokenPayload.directorId } });
        if (!actingUser) {
            const err = new Error('DG introuvable.');
            err.statusCode = 404;
            throw err;
        }
        const current = await getDirectorForDirection(prisma, entity.directionId);
        if (!current?.director || current.director.id !== tokenPayload.directorId) {
            const err = new Error(ATTACHMENT_ERRORS.NOT_DG_OF_DIRECTION);
            err.statusCode = 403;
            throw err;
        }
    }

    const gate = canActorApprove(actingUser, {
        directionId: entity.directionId,
        createdById: entity.createdById || entity.organizerId,
        organizerId: entity.organizerId,
    });
    if (!gate.ok) {
        const err = new Error(gate.error);
        err.statusCode = 403;
        throw err;
    }

    const now = new Date();
    const data = {
        status: DIRECTOR_APPROVED_STATUS,
        approvedById: actingUser.id,
        approvedAt: now,
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null,
    };

    const updated = entityType === 'meeting'
        ? await prisma.meeting.update({ where: { id: entityId }, data })
        : await prisma.mission.update({ where: { id: entityId }, data });

    await writeAudit(prisma, {
        userId: actingUser.id,
        action: entityType === 'meeting' ? 'MEETING_APPROVED' : 'MISSION_APPROVED',
        entity: entityType === 'meeting' ? 'Meeting' : 'Mission',
        entityId,
        details: `Validée par ${actingUser.name}`,
    });

    const assistant = entityType === 'meeting' ? entity.organizer : entity.createdBy;
    await notifyAssistantDecision(prisma, {
        entityType,
        entity: { ...entity, ...updated },
        assistant,
        approved: true,
        actor: actingUser,
    });

    return updated;
}

async function rejectRequest(prisma, { entityType, entityId, actor, reason, tokenPayload }) {
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) {
        const err = new Error('Le motif de refus est obligatoire.');
        err.statusCode = 400;
        throw err;
    }

    const entity = entityType === 'meeting'
        ? await loadMeeting(prisma, entityId)
        : await loadMission(prisma, entityId);
    if (!entity) {
        const err = new Error(entityType === 'meeting' ? 'Réunion introuvable.' : 'Mission introuvable.');
        err.statusCode = 404;
        throw err;
    }
    if (entity.status !== DIRECTOR_PENDING_STATUS) {
        const err = new Error('Cette demande n\'est plus en attente de validation du DG.');
        err.statusCode = 409;
        throw err;
    }

    let actingUser = actor;
    if (tokenPayload) {
        if (tokenPayload.entityId !== entityId || tokenPayload.entityType !== entityType) {
            const err = new Error('Jeton ne correspondant pas à cette demande.');
            err.statusCode = 400;
            throw err;
        }
        actingUser = await prisma.user.findUnique({ where: { id: tokenPayload.directorId } });
        const current = await getDirectorForDirection(prisma, entity.directionId);
        if (!current?.director || current.director.id !== tokenPayload.directorId) {
            const err = new Error(ATTACHMENT_ERRORS.NOT_DG_OF_DIRECTION);
            err.statusCode = 403;
            throw err;
        }
    }

    const gate = canActorApprove(actingUser, {
        directionId: entity.directionId,
        createdById: entity.createdById || entity.organizerId,
        organizerId: entity.organizerId,
    });
    if (!gate.ok) {
        const err = new Error(gate.error);
        err.statusCode = 403;
        throw err;
    }

    const now = new Date();
    const data = {
        status: DIRECTOR_REJECTED_STATUS,
        rejectedById: actingUser.id,
        rejectedAt: now,
        rejectionReason: trimmedReason,
    };

    const updated = entityType === 'meeting'
        ? await prisma.meeting.update({ where: { id: entityId }, data })
        : await prisma.mission.update({ where: { id: entityId }, data });

    await writeAudit(prisma, {
        userId: actingUser.id,
        action: entityType === 'meeting' ? 'MEETING_REJECTED' : 'MISSION_REJECTED',
        entity: entityType === 'meeting' ? 'Meeting' : 'Mission',
        entityId,
        details: `Refusée par ${actingUser.name} : ${trimmedReason}`,
    });

    const assistant = entityType === 'meeting' ? entity.organizer : entity.createdBy;
    await notifyAssistantDecision(prisma, {
        entityType,
        entity: { ...entity, ...updated },
        assistant,
        approved: false,
        reason: trimmedReason,
        actor: actingUser,
    });

    return updated;
}

async function listPendingForDirector(prisma, user) {
    const { isEligibleDirectionDirector } = require('../config/directorWorkflow');
    if (!isEligibleDirectionDirector(user) || !user.directionId) {
        return { meetings: [], missions: [] };
    }
    const where = {
        status: DIRECTOR_PENDING_STATUS,
        directionId: user.directionId,
    };
    const [meetings, missions] = await Promise.all([
        prisma.meeting.findMany({
            where,
            include: {
                organizer: { select: { id: true, name: true, email: true } },
                direction: { select: { id: true, name: true } },
                room: { select: { id: true, name: true } },
                eventType: { select: { id: true, name: true, code: true, color: true } },
            },
            orderBy: { startTime: 'asc' },
            take: 200,
        }),
        prisma.mission.findMany({
            where,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                direction: { select: { id: true, name: true } },
            },
            orderBy: { startTime: 'asc' },
            take: 200,
        }),
    ]);
    return { meetings, missions };
}

async function listMine(prisma, user) {
    const [meetings, missions] = await Promise.all([
        prisma.meeting.findMany({
            where: { organizerId: user.id },
            include: {
                direction: { select: { id: true, name: true } },
                approvedBy: { select: { id: true, name: true } },
                rejectedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        }),
        prisma.mission.findMany({
            where: { createdById: user.id },
            include: {
                direction: { select: { id: true, name: true } },
                approvedBy: { select: { id: true, name: true } },
                rejectedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        }),
    ]);
    return { meetings, missions };
}

module.exports = {
    signApprovalToken,
    verifyApprovalToken,
    buildEmailActionUrls,
    canActorApprove,
    resolveAssistantCreation,
    afterAssistantCreated,
    approveRequest,
    rejectRequest,
    listPendingForDirector,
    listMine,
    loadMeeting,
    loadMission,
};
