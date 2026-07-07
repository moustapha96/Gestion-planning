const { randomUUID } = require('crypto');
const { logger } = require('../utils/logger');
const { logApiRequest } = require('../utils/audit');

const ROUTE_ENTITY_MAP = {
    auth: 'Auth',
    plannings: 'Planning',
    meetings: 'Meeting',
    missions: 'Mission',
    rooms: 'Room',
    users: 'User',
    projects: 'Project',
    notifications: 'Notification',
    calendar: 'Calendar',
    'direct-messages': 'Message',
    'direction-messages': 'Message',
    'project-messages': 'Message',
    events: 'Event',
    repertoire: 'Repertoire',
    'super-admin': 'System',
    validations: 'Validation',
    profile: 'Profile',
    'audit-logs': 'AuditLog',
    admin: 'Admin',
    push: 'Push',
    'role-config': 'RoleConfig',
    dashboard: 'Dashboard',
    '2fa': 'Auth',
    public: 'Public',
};

const RESOURCE_ID_RE = /^[a-z0-9]{12,}$/i;
const RESOURCE_ACTIONS = new Set([
    'approve', 'cancel', 'complete', 'submit', 'validate', 'consolidate', 'return',
    'read', 'read-all', 'export.csv', 'month', 'logo', 'files', 'participants',
    'thread', 'conversations', 'audit', 'unread', 'count', 'settings', 'backup',
    'restore', 'verify', 'activate', 'deactivate', 'reset-password', 'send-reset-link',
]);

function parseSkipPatterns() {
    const fromEnv = String(process.env.AUDIT_LOG_SKIP_PATHS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const defaults = [
        'GET /api/notifications/unread/count',
        'GET /api/audit-logs',
        'GET /api/audit-logs/export.csv',
    ];
    return [...defaults, ...fromEnv];
}

const SKIP_PATTERNS = parseSkipPatterns();

function shouldSkipAudit(req) {
    if (req.method === 'OPTIONS') return true;
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const key = `${req.method} ${path}`;
    return SKIP_PATTERNS.some((pattern) => {
        if (pattern.includes('*')) {
            const re = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
            return re.test(key);
        }
        return key === pattern || key.startsWith(`${pattern}/`);
    });
}

function inferEntityFromPath(path) {
    const segments = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const root = segments[0] || 'api';
    if (root === 'admin' && segments[1]) {
        return ROUTE_ENTITY_MAP.admin;
    }
    return ROUTE_ENTITY_MAP[root] || 'Api';
}

function extractResourceId(path) {
    const segments = path.split('/').filter(Boolean);
    for (let i = 2; i < segments.length; i += 1) {
        const part = segments[i];
        if (RESOURCE_ACTIONS.has(part)) continue;
        if (RESOURCE_ID_RE.test(part)) return part;
    }
    return null;
}

function buildHttpAction(method, statusCode) {
    const verb = String(method || 'GET').toUpperCase();
    if (statusCode >= 500) return `HTTP_${verb}_5XX`;
    if (statusCode >= 400) return `HTTP_${verb}_4XX`;
    return `HTTP_${verb}`;
}

function buildDetails(req, res, durationMs) {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const queryKeys = Object.keys(req.query || {});
    const queryHint = queryKeys.length ? ` ?${queryKeys.slice(0, 4).join('&')}` : '';
    return `[${res.statusCode}] ${req.method} ${path}${queryHint} (${durationMs}ms)`;
}

/**
 * Journalise chaque requête API dans audit.log + table AuditLog (page Admin Journaux).
 */
function auditRequestMiddleware(req, res, next) {
    if (!req.originalUrl?.startsWith('/api') && !req.url?.startsWith('/api')) {
        return next();
    }

    req.auditRequestId = req.auditRequestId || randomUUID();
    const start = Date.now();
    const skip = shouldSkipAudit(req);

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const path = (req.originalUrl || req.url || '').split('?')[0];
        const userId = req.user?.id || null;

        logger.logRequest(req.method, path, res.statusCode, durationMs, userId);

        if (skip) return;

        const entity = inferEntityFromPath(path);
        const resourceId = extractResourceId(path);
        const action = buildHttpAction(req.method, res.statusCode);
        const details = buildDetails(req, res, durationMs);

        logApiRequest(req, {
            action,
            entity,
            entityId: resourceId || req.auditRequestId,
            details,
            statusCode: res.statusCode,
            durationMs,
            path,
            method: req.method,
        }).catch(() => {});
    });

    next();
}

module.exports = auditRequestMiddleware;
