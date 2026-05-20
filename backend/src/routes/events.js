const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const roleMiddleware = require('../middlewares/role.middleware');
const { ROLES, ADMIN_ROUTE_ROLES, isPrivilegedAdmin, isSuperAdmin } = require('../config/roles');
const { meetingCalendarWhereForUser } = require('../config/meetingVisibility');
const { detachProjectReferences, detachDirectionReferences } = require('../utils/forceDelete');
const { syncDirectionDiscussionMembers } = require('../services/directionDiscussion.service');
const { validateConsolidatorId, PROJECT_CONSOLIDATOR_INCLUDE } = require('../services/projectConsolidator.service');

const router = express.Router();
const directionLogosDir = path.join(__dirname, '../../uploads/directions');
const projectLogosDir = path.join(__dirname, '../../uploads/project-logos');
const uploadDirectionLogo = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(directionLogosDir, { recursive: true });
            cb(null, directionLogosDir);
        },
        filename(_req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase();
            cb(null, `direction_logo_${Date.now()}${ext || '.png'}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadProjectLogo = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(projectLogosDir, { recursive: true });
            cb(null, projectLogosDir);
        },
        filename(_req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase();
            cb(null, `project_logo_${Date.now()}${ext || '.png'}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

function canManageDirections(role) {
    return isPrivilegedAdmin(role) || role === ROLES.DG;
}

function canViewAllPlannings(role) {
    return [
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN,
        ROLES.CONSOLIDATEUR,
        ROLES.COORDINATEUR_PROJET,
        ROLES.SECRETAIRE_GENERAL,
        ROLES.DG,
    ].includes(role);
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

/**
 * Types d'événements par défaut.
 * Ces lignes sont automatiquement créées si manquantes au démarrage du serveur
 * et lors d'un appel à GET /events/event-types.
 *
 * Le code est utilisé comme clé fonctionnelle (REUNION pour les réunions,
 * MISSION pour les missions) et NE DOIT PAS être renommé.
 */
const DEFAULT_EVENT_TYPES = [
    { code: 'REUNION',   name: 'Réunion',      color: '#1565C0', sortOrder: 10 },
    { code: 'MISSION',   name: 'Mission',      color: '#722ed1', sortOrder: 20 },
    { code: 'ATELIER',   name: 'Atelier',      color: '#13c2c2', sortOrder: 30 },
    { code: 'FORMATION', name: 'Formation',    color: '#52c41a', sortOrder: 40 },
    { code: 'AUDIENCE',  name: 'Audience',     color: '#faad14', sortOrder: 50 },
    { code: 'AUTRE',     name: 'Autre',        color: '#8c8c8c', sortOrder: 99 },
];

/**
 * Crée les types d'événements par défaut s'ils n'existent pas.
 * Idempotent : peut être appelé plusieurs fois sans risque.
 * @returns {Promise<{created: string[], existed: string[]}>}
 */
async function ensureDefaultEventTypes(prisma) {
    const created = [];
    const existed = [];
    for (const def of DEFAULT_EVENT_TYPES) {
        const found = await prisma.eventType.findUnique({ where: { code: def.code } });
        if (found) {
            // Réactive automatiquement si désactivé
            if (!found.isActive) {
                await prisma.eventType.update({
                    where: { id: found.id },
                    data: { isActive: true },
                });
            }
            existed.push(def.code);
        } else {
            await prisma.eventType.create({
                data: { ...def, isActive: true },
            });
            created.push(def.code);
        }
    }
    return { created, existed };
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
                    ...meetingCalendarWhereForUser(req.user),
                    ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
                    ...(directionId ? { directionId } : {}),
                    ...(projectId ? { projectId } : {}),
                },
                include: {
                    organizer: { select: { id: true, name: true, email: true } },
                    room: { select: { id: true, name: true, location: true } },
                    invitations: { select: { userId: true, status: true } },
                    direction: { select: { id: true, name: true, code: true } },
                    project: { select: { id: true, name: true, code: true } },
                    eventType: { select: { id: true, name: true, code: true, color: true } },
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
                    eventType: { select: { id: true, name: true, code: true, color: true } },
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
                category: m.eventType
                    ? { id: m.eventType.id, name: m.eventType.name, code: m.eventType.code, color: m.eventType.color }
                    : null,
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
                category: e.eventType
                    ? { id: e.eventType.id, name: e.eventType.name, code: e.eventType.code, color: e.eventType.color }
                    : null,
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
        const dbTypeRows = await req.prisma.eventType.findMany({
            where: { isActive: true },
            select: { code: true },
            orderBy: { sortOrder: 'asc' },
        });
        const dbCodes = (dbTypeRows || []).map((x) => String(x.code || '').toUpperCase()).filter(Boolean);
        const [eventTypes, directions, projects] = await Promise.all([
            Promise.resolve(Array.from(new Set(['MEETING', 'MISSION', ...planningTypes, ...dbCodes])).sort()),
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
        if (!canManageDirections(req.user?.role)) {
            return res.status(403).json({ error: 'Acces reserve admin/DG.' });
        }
        const name = String(req.body?.name || '').trim();
        const code = String(req.body?.code || '').trim() || null;
        const logoUrl = String(req.body?.logoUrl || '').trim();
        const description = String(req.body?.description || '').trim() || null;
        if (!name) return res.status(400).json({ error: 'Le nom de la direction est requis.' });
        if (!logoUrl) return res.status(400).json({ error: 'Le logo de la direction est requis.' });
        const created = await req.prisma.direction.create({
            data: { name, code, logoUrl, description, isActive: true },
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/directions/logo', uploadDirectionLogo.single('logo'), async (req, res) => {
    try {
        if (!canManageDirections(req.user?.role)) {
            return res.status(403).json({ error: 'Acces reserve admin/DG.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun logo reçu.' });
        }
        if (req.file.mimetype && !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Le logo doit être une image.' });
        }
        const logoUrl = `/uploads/directions/${req.file.filename}`;
        return res.status(201).json({ logoUrl });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

router.get('/directions/:id', async (req, res) => {
    try {
        if (!canManageDirections(req.user?.role)) {
            return res.status(403).json({ error: 'Acces reserve admin/DG.' });
        }
        const direction = await req.prisma.direction.findUnique({
            where: { id: req.params.id },
            include: {
                users: {
                    where: { isDeleted: false },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        avatarUrl: true,
                        createdAt: true,
                    },
                    orderBy: { name: 'asc' },
                },
            },
        });
        if (!direction) return res.status(404).json({ error: 'Direction introuvable.' });
        return res.json(direction);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

router.post('/projects', async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        const name = String(req.body?.name || '').trim();
        const code = String(req.body?.code || '').trim() || null;
        const description = String(req.body?.description || '').trim() || null;
        const logoUrlRaw = req.body?.logoUrl;
        const logoUrl = logoUrlRaw !== undefined ? String(logoUrlRaw || '').trim() || '/logo-gp.png' : '/logo-gp.png';
        if (!name) return res.status(400).json({ error: 'Le nom du projet est requis.' });
        const consolidatorCheck = await validateConsolidatorId(req.prisma, req.body?.consolidatorId ?? null);
        if (!consolidatorCheck.ok) return res.status(400).json({ error: consolidatorCheck.error });
        const created = await req.prisma.project.create({
            data: {
                name,
                code,
                description,
                logoUrl,
                consolidatorId: consolidatorCheck.value ?? null,
                isActive: true,
                status: 'ACTIVE',
                createdById: req.user?.id || null,
            },
            include: PROJECT_CONSOLIDATOR_INCLUDE,
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/projects/logo', uploadProjectLogo.single('logo'), async (req, res) => {
    try {
        if (!isPrivilegedAdmin(req.user?.role)) return res.status(403).json({ error: 'Acces reserve admin.' });
        if (!req.file) return res.status(400).json({ error: 'Aucun logo reçu.' });
        if (req.file.mimetype && !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Le logo doit être une image.' });
        }
        const logoUrl = `/uploads/project-logos/${req.file.filename}`;
        return res.status(201).json({ logoUrl });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

router.get('/taxonomy', async (req, res) => {
    try {
        const includeInactive = canManageDirections(req.user?.role) && String(req.query?.all || '') === '1';
        const [directions, projects, eventTypes] = await Promise.all([
            req.prisma.direction.findMany({
                where: includeInactive ? {} : { isActive: true },
                orderBy: { name: 'asc' },
            }),
            req.prisma.project.findMany({
                where: includeInactive ? {} : { isActive: true, status: 'ACTIVE' },
                include: PROJECT_CONSOLIDATOR_INCLUDE,
                orderBy: { name: 'asc' },
            }),
            req.prisma.eventType.findMany({
                where: includeInactive ? {} : { isActive: true },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                select: { id: true, name: true, code: true, color: true, sortOrder: true, isActive: true },
            }),
        ]);
        res.json({ directions, projects, eventTypes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/directions/:id', async (req, res) => {
    try {
        if (!canManageDirections(req.user?.role)) {
            return res.status(403).json({ error: 'Acces reserve admin/DG.' });
        }
        const name = req.body?.name !== undefined ? String(req.body.name || '').trim() : undefined;
        const code = req.body?.code !== undefined ? (String(req.body.code || '').trim() || null) : undefined;
        const logoUrl = req.body?.logoUrl !== undefined ? String(req.body.logoUrl || '').trim() : undefined;
        const description = req.body?.description !== undefined ? (String(req.body.description || '').trim() || null) : undefined;
        const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
        const data = {};
        if (name !== undefined) {
            if (!name) return res.status(400).json({ error: 'Le nom de la direction est requis.' });
            data.name = name;
        }
        if (code !== undefined) data.code = code;
        if (logoUrl !== undefined) {
            if (!logoUrl) return res.status(400).json({ error: 'Le logo de la direction est requis.' });
            data.logoUrl = logoUrl;
        }
        if (description !== undefined) data.description = description;
        if (isActive !== undefined) data.isActive = isActive;
        const updated = await req.prisma.direction.update({ where: { id: req.params.id }, data });
        await syncDirectionDiscussionMembers(req.prisma, updated.id);
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
        const logoUrl = req.body?.logoUrl !== undefined ? String(req.body.logoUrl || '').trim() || '/logo-gp.png' : undefined;
        const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
        const data = {};
        if (name !== undefined) {
            if (!name) return res.status(400).json({ error: 'Le nom du projet est requis.' });
            data.name = name;
        }
        if (code !== undefined) data.code = code;
        if (description !== undefined) data.description = description;
        if (logoUrl !== undefined) data.logoUrl = logoUrl;
        if (isActive !== undefined) data.isActive = isActive;
        if (req.body?.consolidatorId !== undefined) {
            const consolidatorCheck = await validateConsolidatorId(req.prisma, req.body.consolidatorId);
            if (!consolidatorCheck.ok) return res.status(400).json({ error: consolidatorCheck.error });
            data.consolidatorId = consolidatorCheck.value ?? null;
        }
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
        const updated = await req.prisma.project.update({
            where: { id: req.params.id },
            data,
            include: PROJECT_CONSOLIDATOR_INCLUDE,
        });
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
        const force = isSuperAdmin(req.user?.role) && ['1', 'true'].includes(String(req.query.force || ''));
        if (totalUsage > 0 && !force) {
            return res.status(409).json({
                error: 'Ce projet est utilise et ne peut pas etre supprime.',
                usage: { meetings: meetingCount, missions: missionCount, planningEvents: planningEventCount, total: totalUsage },
            });
        }
        if (force && totalUsage > 0) {
            await detachProjectReferences(req.prisma, projectId);
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
        const force = isSuperAdmin(req.user?.role) && ['1', 'true'].includes(String(req.query.force || ''));
        if (totalUsage > 0 && !force) {
            return res.status(409).json({
                error: 'Cette direction est utilisee et ne peut pas etre supprimee.',
                usage: { meetings: meetingCount, missions: missionCount, planningEvents: planningEventCount, total: totalUsage },
            });
        }
        if (force && totalUsage > 0) {
            await detachDirectionReferences(req.prisma, directionId);
        }
        await req.prisma.direction.delete({ where: { id: directionId } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/event-types', async (req, res) => {
    try {
        const all = isPrivilegedAdmin(req.user?.role) && String(req.query.all || '') === '1';

        // Seed à la volée si la table est totalement vide ou s'il manque REUNION/MISSION
        const required = ['REUNION', 'MISSION'];
        const present = await req.prisma.eventType.findMany({
            where: { code: { in: required } },
            select: { code: true },
        });
        if (present.length < required.length) {
            await ensureDefaultEventTypes(req.prisma);
        }

        const rows = await req.prisma.eventType.findMany({
            where: all ? {} : { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /events/event-types/ensure-defaults
 * Crée (ou réactive) les types d'événements par défaut.
 * Réservé aux admins. Idempotent.
 */
router.post('/event-types/ensure-defaults', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const result = await ensureDefaultEventTypes(req.prisma);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/event-types', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const name = String(req.body?.name || '').trim();
        const code = String(req.body?.code || '').trim().toUpperCase().replace(/\s+/g, '_');
        const color = String(req.body?.color || '#1565C0').trim() || '#1565C0';
        const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0;
        if (!name) return res.status(400).json({ error: 'Le libellé est requis.' });
        if (!code) return res.status(400).json({ error: 'Le code est requis (ex. ATELIER).' });
        const created = await req.prisma.eventType.create({
            data: { name, code, color, sortOrder, isActive: true },
        });
        res.status(201).json(created);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Ce code existe déjà.' });
        res.status(400).json({ error: error.message });
    }
});

router.put('/event-types/:id', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const id = req.params.id;
        const data = {};
        if (req.body.name !== undefined) {
            const name = String(req.body.name || '').trim();
            if (!name) return res.status(400).json({ error: 'Le libellé ne peut pas être vide.' });
            data.name = name;
        }
        if (req.body.code !== undefined) {
            const code = String(req.body.code || '').trim().toUpperCase().replace(/\s+/g, '_');
            if (!code) return res.status(400).json({ error: 'Code invalide.' });
            data.code = code;
        }
        if (req.body.color !== undefined) data.color = String(req.body.color || '').trim() || '#1565C0';
        if (req.body.sortOrder !== undefined) data.sortOrder = Number(req.body.sortOrder) || 0;
        if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
        const updated = await req.prisma.eventType.update({ where: { id }, data });
        res.json(updated);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Ce code existe déjà.' });
        res.status(400).json({ error: error.message });
    }
});

router.delete('/event-types/:id', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const updated = await req.prisma.eventType.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });
        res.json(updated);
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
module.exports.ensureDefaultEventTypes = ensureDefaultEventTypes;
module.exports.DEFAULT_EVENT_TYPES = DEFAULT_EVENT_TYPES;
