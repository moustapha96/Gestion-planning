const express = require('express');
const roleMiddleware = require('../middlewares/role.middleware');
const { ADMIN_ROUTE_ROLES } = require('../config/roles');
const { parseUtcDate, utcEndOfDay } = require('../utils/dateUtc');

const router = express.Router();

/**
 * GET /api/audit-logs - Liste des logs d'audit (ADMIN)
 * Query: page, limit, action, entity, from (ISO date), to (ISO date)
 */
router.get('/', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const { action, entity, from, to, search, method, httpOnly, businessOnly } = req.query;

        const where = {};
        if (action && typeof action === 'string') {
            where.action = action;
        } else if (method && typeof method === 'string') {
            where.action = { startsWith: `HTTP_${method.toUpperCase()}` };
        }
        if (entity && typeof entity === 'string') where.entity = entity;
        if (!action && !method) {
            if (httpOnly === '1' || httpOnly === 'true') {
                where.action = { startsWith: 'HTTP_' };
            } else if (businessOnly === '1' || businessOnly === 'true') {
                where.NOT = { action: { startsWith: 'HTTP_' } };
            }
        }
        if (search && typeof search === 'string' && search.trim()) {
            where.OR = [
                { details: { contains: search.trim(), mode: 'insensitive' } },
                { action: { contains: search.trim(), mode: 'insensitive' } },
                { entity: { contains: search.trim(), mode: 'insensitive' } },
                { entityId: { contains: search.trim(), mode: 'insensitive' } },
            ];
        }
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = parseUtcDate(from);
            if (to) where.createdAt.lte = utcEndOfDay(parseUtcDate(to));
        }

        const [logs, total] = await Promise.all([
            req.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
            }),
            req.prisma.auditLog.count({ where }),
        ]);

        res.json({ logs, total, page, limit });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/audit-logs/export.csv — Export CSV (ADMIN) — CDC §3.9.2
 * Query: action, entity, from (ISO date), to (ISO date)
 */
router.get('/export.csv', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const { action, entity, from, to, search, method, httpOnly, businessOnly } = req.query;
        const where = {};
        if (action) {
            where.action = action;
        } else if (method) {
            where.action = { startsWith: `HTTP_${String(method).toUpperCase()}` };
        } else if (httpOnly === '1' || httpOnly === 'true') {
            where.action = { startsWith: 'HTTP_' };
        } else if (businessOnly === '1' || businessOnly === 'true') {
            where.NOT = { action: { startsWith: 'HTTP_' } };
        }
        if (entity) where.entity = entity;
        if (search && String(search).trim()) {
            const q = String(search).trim();
            where.OR = [
                { details: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
                { entity: { contains: q, mode: 'insensitive' } },
                { entityId: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = parseUtcDate(from);
            if (to) where.createdAt.lte = utcEndOfDay(parseUtcDate(to));
        }

        const logs = await req.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } },
        });

        // Génération CSV simple sans dépendance externe
        const escape = (v) => {
            if (v == null) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n\r]/.test(s) ? `"${s}"` : s;
        };
        const header = ['id', 'date', 'utilisateur', 'email', 'action', 'entite', 'entiteId', 'ip', 'details'];
        const rows = logs.map((l) => [
            l.id,
            l.createdAt.toISOString(),
            l.user?.name ?? '',
            l.user?.email ?? '',
            l.action,
            l.entity,
            l.entityId,
            l.ipAddress ?? '',
            l.details ?? '',
        ].map(escape).join(','));

        const csv = [header.join(','), ...rows].join('\r\n');
        const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
