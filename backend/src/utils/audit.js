/**
 * Enregistre une action d'audit en base (pour la page Admin Logs) et dans le fichier audit.log
 * @param {object} req - Requête Express (req.prisma, req.user?, req.ip)
 * @param {string} action - Ex: LOGIN, MEETING_CREATED, PLANNING_SUBMITTED
 * @param {string} entity - Ex: User, Meeting, Planning
 * @param {string} entityId - ID de l'entité concernée
 * @param {string} [details] - Description lisible
 */
async function createAuditLog(req, action, entity, entityId, details = null) {
    const { auditLogger } = require('./logger');
    auditLogger.info(action, details || `${entity} ${entityId}`, { userId: req.user?.id, entityId });
    try {
        await req.prisma.auditLog.create({
            data: {
                userId: req.user?.id || null,
                action,
                entity,
                entityId: String(entityId || req.auditRequestId || 'unknown'),
                ipAddress: req.ip || null,
                details: details || undefined,
            },
        });
    } catch (err) {
        // Ne pas faire échouer la requête si l'écriture audit échoue
        require('./logger').logger.warn('AUDIT_LOG_DB_FAILED', err.message, { action, entityId });
    }
}

/**
 * Journalise une requête HTTP dans les journaux d'audit (fichier + base).
 */
async function logApiRequest(req, {
    action,
    entity,
    entityId,
    details,
    statusCode,
    durationMs,
    path,
    method,
}) {
    const { auditLogger } = require('./logger');
    auditLogger.info(action, details, {
        userId: req.user?.id || null,
        entityId,
        statusCode,
        durationMs,
        path,
        method,
    });

    if (!req.prisma) return;

    try {
        await req.prisma.auditLog.create({
            data: {
                userId: req.user?.id || null,
                action,
                entity,
                entityId: String(entityId || req.auditRequestId || 'unknown'),
                ipAddress: req.ip || null,
                details,
            },
        });
    } catch (err) {
        require('./logger').logger.warn('AUDIT_LOG_DB_FAILED', err.message, { action, entityId, path });
    }
}

module.exports = { createAuditLog, logApiRequest };
