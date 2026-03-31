const express = require('express');
const { ROLES, isPrivilegedAdmin } = require('../config/roles');

const router = express.Router();

function canViewAllPlannings(role) {
    return [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CONSOLIDATEUR, ROLES.DG].includes(role);
}

function normalizeDate(value, endOfDay = false) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    if (endOfDay) d.setHours(23, 59, 59, 999);
    return d;
}

function includesInsensitive(haystack, needle) {
    if (!needle) return true;
    return String(haystack || '').toLowerCase().includes(String(needle).toLowerCase());
}

async function ensureDirectionProjectExist(prisma, directionId, projectId) {
    if (directionId) {
        const d = await prisma.direction.findUnique({ where: { id: directionId }, select: { id: true } });
        if (!d) throw new Error('Direction introuvable');
    }
    if (projectId) {
        const p = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, status: true, isActive: true } });
        if (!p) throw new Error('Projet introuvable');
        if (p.status !== 'ACTIVE' || !p.isActive) throw new Error('Projet inactif, en pause ou terminé');
    }
}

router.get('/unified', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const source = String(req.query.source || '').trim().toUpperCase();
        const eventType = String(req.query.eventType || '').trim().toUpperCase();
        const directionId = String(req.query.directionId || '').trim() || null;
        const projectId = String(req.query.projectId || '').trim() || null;
        const from = normalizeDate(req.query.from);
        const to = normalizeDate(req.query.to, true);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const skip = (page - 1) * limit;
        const userId = req.user?.id;
        const role = req.user?.role;
        const isAdmin = isPrivilegedAdmin(role);
        const canAllPlannings = canViewAllPlannings(role);

        const [meetings, missions, planningEvents] = await Promise.all([
            req.prisma.meeting.findMany({
                where: {
                    ...(isAdmin ? {} : {
                        OR: [
                            { organizerId: userId },
                            { invitations: { some: { userId } } },
                        ],
                    }),
                    ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                    status: { not: 'CANCELLED' },
                    ...(directionId ? { directionId } : {}),
                    ...(projectId ? { projectId } : {}),
                },
                include: {
                    organizer: { select: { id: true, name: true, email: true } },
                    room: { select: { id: true, name: true, location: true } },
                    invitations: { select: { userId: true, status: true } },
                    direction: { select: { id: true, name: true, code: true } },
                    project: { select: { id: true, name: true, code: true } },
                },
                orderBy: { startTime: 'desc' },
                take: 500,
            }),
            req.prisma.mission.findMany({
                where: {
                    ...(isAdmin ? {} : {
                        OR: [
                            { createdById: userId },
                            { assignments: { some: { userId } } },
                        ],
                    }),
                    ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                    status: { not: 'CANCELLED' },
                    ...(directionId ? { directionId } : {}),
                    ...(projectId ? { projectId } : {}),
                },
                include: {
                    createdBy: { select: { id: true, name: true, email: true } },
                    assignments: { select: { userId: true } },
                    direction: { select: { id: true, name: true, code: true } },
                    project: { select: { id: true, name: true, code: true } },
                },
                orderBy: { startTime: 'desc' },
                take: 500,
            }),
            req.prisma.planningEvent.findMany({
                where: {
                    ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                    planning: canAllPlannings ? {} : { userId },
                    ...(directionId ? { directionId } : {}),
                    ...(projectId ? { projectId } : {}),
                },
                include: {
                    room: { select: { id: true, name: true, location: true } },
                    direction: { select: { id: true, name: true, code: true } },
                    project: { select: { id: true, name: true, code: true } },
                    planning: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
                orderBy: { startTime: 'desc' },
                take: 500,
            }),
        ]);

        let items = [
            ...meetings.map((m) => ({
                id: `MEETING:${m.id}`,
                rawId: m.id,
                sourceType: 'MEETING',
                eventType: 'MEETING',
                title: m.title,
                description: m.agenda || '',
                startAt: m.startTime,
                endAt: m.endTime,
                location: m.room?.name || '',
                status: m.status,
                responsibleUsers: m.organizer ? [m.organizer] : [],
                participantsCount: 1 + (m.invitations || []).length,
                link: `/meetings/${m.id}`,
                project: m.project || null,
                direction: m.direction || null,
            })),
            ...missions.map((m) => ({
                id: `MISSION:${m.id}`,
                rawId: m.id,
                sourceType: 'MISSION',
                eventType: 'MISSION',
                title: m.title,
                description: m.description || '',
                startAt: m.startTime,
                endAt: m.endTime,
                location: m.location || '',
                status: m.status,
                responsibleUsers: m.createdBy ? [m.createdBy] : [],
                participantsCount: 1 + (m.assignments || []).length,
                link: `/missions/${m.id}`,
                project: m.project || null,
                direction: m.direction || null,
            })),
            ...planningEvents.map((e) => ({
                id: `PLANNING_EVENT:${e.id}`,
                rawId: e.id,
                sourceType: 'PLANNING_EVENT',
                eventType: String(e.type || 'PLANNING_EVENT').toUpperCase(),
                title: e.title,
                description: e.description || '',
                startAt: e.startTime,
                endAt: e.endTime,
                location: e.room?.name || e.destination || '',
                status: e.planning?.status || 'DRAFT',
                responsibleUsers: e.planning?.user ? [e.planning.user] : [],
                participantsCount: 1,
                link: `/planning/${e.planningId}`,
                project: e.project || null,
                direction: e.direction || null,
            })),
        ];

        if (source) {
            items = items.filter((x) => x.sourceType === source);
        }
        if (eventType) {
            items = items.filter((x) => x.eventType === eventType);
        }
        if (q) {
            items = items.filter((x) =>
                includesInsensitive(x.title, q) ||
                includesInsensitive(x.description, q) ||
                includesInsensitive(x.location, q) ||
                includesInsensitive(x.responsibleUsers?.[0]?.name, q) ||
                includesInsensitive(x.responsibleUsers?.[0]?.email, q) ||
                includesInsensitive(x.project?.name, q) ||
                includesInsensitive(x.direction?.name, q)
            );
        }

        items.sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
        const total = items.length;
        const paged = items.slice(skip, skip + limit);
        const [eventTypes, directions, projects] = await Promise.all([
            Promise.resolve(Array.from(new Set(items.map((x) => x.eventType))).sort()),
            req.prisma.direction.findMany({
                where: { isActive: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
            req.prisma.project.findMany({
                where: { isActive: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        res.json({
            items: paged,
            total,
            page,
            limit,
            pages: Math.max(1, Math.ceil(total / limit)),
            filtersMeta: {
                directions,
                projects,
                eventTypes,
                sourceTypes: ['MEETING', 'MISSION', 'PLANNING_EVENT'],
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/filters/meta', async (req, res) => {
    try {
        const eventTypesRaw = await req.prisma.planningEvent.groupBy({
            by: ['type'],
            _count: { id: true },
        });
        const planningTypes = (eventTypesRaw || []).map((x) => String(x.type || '').toUpperCase()).filter(Boolean);
        const [eventTypes, directions, projects] = await Promise.all([
            Promise.resolve(Array.from(new Set(['MEETING', 'MISSION', ...planningTypes])).sort()),
            req.prisma.direction.findMany({
                where: { isActive: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
            req.prisma.project.findMany({
                where: { isActive: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
        ]);
        res.json({
            directions,
            projects,
            eventTypes,
            sourceTypes: ['MEETING', 'MISSION', 'PLANNING_EVENT'],
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/directions', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        const name = String(req.body?.name || '').trim();
        const code = String(req.body?.code || '').trim() || null;
        const description = String(req.body?.description || '').trim() || null;
        if (!name) return res.status(400).json({ error: 'Le nom de la direction est requis.' });
        const created = await req.prisma.direction.create({
            data: { name, code, description, isActive: true },
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/projects', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        const name = String(req.body?.name || '').trim();
        const code = String(req.body?.code || '').trim() || null;
        const description = String(req.body?.description || '').trim() || null;
        if (!name) return res.status(400).json({ error: 'Le nom du projet est requis.' });
        const created = await req.prisma.project.create({
            data: { name, code, description, isActive: true, status: 'ACTIVE', createdById: req.user?.id || null },
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/taxonomy', async (req, res) => {
    try {
        const includeInactive = isPrivilegedAdmin(req.user?.role) && String(req.query?.all || '') === '1';
        const [directions, projects] = await Promise.all([
            req.prisma.direction.findMany({
                where: includeInactive ? {} : { isActive: true },
                orderBy: { name: 'asc' },
            }),
            req.prisma.project.findMany({
                where: includeInactive ? {} : { isActive: true, status: 'ACTIVE' },
                orderBy: { name: 'asc' },
            }),
        ]);
        res.json({ directions, projects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/directions/:id', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        const name = req.body?.name !== undefined ? String(req.body.name || '').trim() : undefined;
        const code = req.body?.code !== undefined ? (String(req.body.code || '').trim() || null) : undefined;
        const description = req.body?.description !== undefined ? (String(req.body.description || '').trim() || null) : undefined;
        const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
        const data = {};
        if (name !== undefined) {
            if (!name) return res.status(400).json({ error: 'Le nom de la direction est requis.' });
            data.name = name;
        }
        if (code !== undefined) data.code = code;
        if (description !== undefined) data.description = description;
        if (isActive !== undefined) data.isActive = isActive;
        const updated = await req.prisma.direction.update({ where: { id: req.params.id }, data });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/projects/:id', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        const name = req.body?.name !== undefined ? String(req.body.name || '').trim() : undefined;
        const code = req.body?.code !== undefined ? (String(req.body.code || '').trim() || null) : undefined;
        const description = req.body?.description !== undefined ? (String(req.body.description || '').trim() || null) : undefined;
        const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
        const data = {};
        if (name !== undefined) {
            if (!name) return res.status(400).json({ error: 'Le nom du projet est requis.' });
            data.name = name;
        }
        if (code !== undefined) data.code = code;
        if (description !== undefined) data.description = description;
        if (isActive !== undefined) data.isActive = isActive;
        if (isActive !== undefined && req.body?.status === undefined) {
            data.status = isActive ? 'ACTIVE' : 'PAUSED';
        }
        if (req.body?.status !== undefined) {
            const s = String(req.body.status || '').toUpperCase();
            if (!['ACTIVE', 'PAUSED', 'COMPLETED'].includes(s)) {
                return res.status(400).json({ error: 'Statut projet invalide.' });
            }
            data.status = s;
            data.isActive = s === 'ACTIVE';
        }
        const updated = await req.prisma.project.update({ where: { id: req.params.id }, data });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/projects/:id', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        const projectId = req.params.id;
        const [meetingCount, missionCount, planningEventCount] = await Promise.all([
            req.prisma.meeting.count({ where: { projectId } }),
            req.prisma.mission.count({ where: { projectId } }),
            req.prisma.planningEvent.count({ where: { projectId } }),
        ]);
        const totalUsage = meetingCount + missionCount + planningEventCount;
        if (totalUsage > 0) {
            return res.status(409).json({
                error: 'Ce projet est utilise et ne peut pas etre supprime.',
                usage: { meetings: meetingCount, missions: missionCount, planningEvents: planningEventCount, total: totalUsage },
            });
        }
        await req.prisma.project.delete({ where: { id: projectId } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/directions/:id', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        const directionId = req.params.id;
        const [meetingCount, missionCount, planningEventCount] = await Promise.all([
            req.prisma.meeting.count({ where: { directionId } }),
            req.prisma.mission.count({ where: { directionId } }),
            req.prisma.planningEvent.count({ where: { directionId } }),
        ]);
        const totalUsage = meetingCount + missionCount + planningEventCount;
        if (totalUsage > 0) {
            return res.status(409).json({
                error: 'Cette direction est utilisee et ne peut pas etre supprimee.',
                usage: { meetings: meetingCount, missions: missionCount, planningEvents: planningEventCount, total: totalUsage },
            });
        }
        await req.prisma.direction.delete({ where: { id: directionId } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/validate-links', async (req, res) => {
    try {
        await ensureDirectionProjectExist(req.prisma, req.body?.directionId || null, req.body?.projectId || null);
        res.json({ ok: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
