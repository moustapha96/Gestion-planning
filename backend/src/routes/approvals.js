const express = require('express');
const { ROLES, isPrivilegedAdmin, normalizeStoredRole } = require('../config/roles');
const {
    approveRequest,
    rejectRequest,
    listPendingForDirector,
    listMine,
    verifyApprovalToken,
} = require('../services/directorApproval.service');
const { logger } = require('../utils/logger');

const router = express.Router();

function parseEntity(kind) {
    const k = String(kind || '').toLowerCase();
    if (k === 'meeting' || k === 'meetings' || k === 'reunion') return 'meeting';
    if (k === 'mission' || k === 'missions') return 'mission';
    return null;
}

router.get('/pending', async (req, res) => {
    try {
        const role = normalizeStoredRole(req.user?.role);
        if (role !== ROLES.DG && !isPrivilegedAdmin(role)) {
            return res.status(403).json({ error: 'Réservé au DG de la direction ou à l\'administration.' });
        }
        const data = await listPendingForDirector(req.prisma, req.user);
        if (isPrivilegedAdmin(role) && role !== ROLES.DG) {
            const [meetings, missions] = await Promise.all([
                req.prisma.meeting.findMany({
                    where: { status: 'PENDING_DIRECTOR_APPROVAL' },
                    include: {
                        organizer: { select: { id: true, name: true, email: true } },
                        direction: { select: { id: true, name: true } },
                        room: { select: { id: true, name: true } },
                    },
                    orderBy: { startTime: 'asc' },
                    take: 200,
                }),
                req.prisma.mission.findMany({
                    where: { status: 'PENDING_DIRECTOR_APPROVAL' },
                    include: {
                        createdBy: { select: { id: true, name: true, email: true } },
                        direction: { select: { id: true, name: true } },
                    },
                    orderBy: { startTime: 'asc' },
                    take: 200,
                }),
            ]);
            return res.json({ meetings, missions });
        }
        return res.json(data);
    } catch (error) {
        logger.error('GET_APPROVALS_PENDING', error.message, { userId: req.user?.id });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/mine', async (req, res) => {
    try {
        const data = await listMine(req.prisma, req.user);
        res.json(data);
    } catch (error) {
        logger.error('GET_APPROVALS_MINE', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

router.post('/:kind/:id/approve', async (req, res) => {
    try {
        const entityType = parseEntity(req.params.kind);
        if (!entityType) return res.status(400).json({ error: 'Type de demande invalide.' });
        const updated = await approveRequest(req.prisma, {
            entityType,
            entityId: req.params.id,
            actor: req.user,
        });
        res.json(updated);
    } catch (error) {
        logger.warn('APPROVE_REQUEST', error.message, { userId: req.user?.id, id: req.params.id });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.post('/:kind/:id/reject', async (req, res) => {
    try {
        const entityType = parseEntity(req.params.kind);
        if (!entityType) return res.status(400).json({ error: 'Type de demande invalide.' });
        const updated = await rejectRequest(req.prisma, {
            entityType,
            entityId: req.params.id,
            actor: req.user,
            reason: req.body?.reason || req.body?.rejectionReason,
        });
        res.json(updated);
    } catch (error) {
        logger.warn('REJECT_REQUEST', error.message, { userId: req.user?.id, id: req.params.id });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/** Utilisé aussi depuis les routes publiques après vérification du jeton. */
router.verifyApprovalToken = verifyApprovalToken;

module.exports = router;
