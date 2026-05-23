require('dotenv').config();
const { applyProcessTimezone, APP_TIMEZONE, cronTimezoneOptions } = require('./src/config/timezone');
applyProcessTimezone();

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { PrismaClient } = require('@prisma/client');

const uploadsDir = path.join(__dirname, 'uploads');
const backupsDir = path.join(__dirname, 'backups');
[
    path.join(uploadsDir, 'avatars'),
    path.join(uploadsDir, 'meetings'),
    path.join(uploadsDir, 'direct-messages'),
    path.join(uploadsDir, 'branding'),
    path.join(uploadsDir, 'project-files'),
    path.join(uploadsDir, 'project-logos'),
    path.join(uploadsDir, 'project-messages'),
    backupsDir,
].forEach((dir) => {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
});

const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { logger } = require('./src/utils/logger');
const { runWeeklyReport } = require('./src/jobs/weeklyReport');
const { runMeetingReminders } = require('./src/jobs/meetingReminders');
const { runDailyDigest } = require('./src/jobs/dailyDigest');
const { runMeetingAutoClose } = require('./src/jobs/meetingAutoClose');
const swaggerSpec = require('./src/config/swagger');
const authMiddleware = require('./src/middlewares/auth.middleware');
const roleMiddleware = require('./src/middlewares/role.middleware');
const swaggerAuth = require('./src/middlewares/swaggerAuth.middleware');

const authRoutes = require('./src/routes/auth');
const planningRoutes = require('./src/routes/plannings');
const meetingRoutes = require('./src/routes/meetings');
const missionRoutes = require('./src/routes/missions');
const roomRoutes = require('./src/routes/rooms');
const userRoutes = require('./src/routes/users');
const roleConfigRoutes = require('./src/routes/role-config');
const dashboardRoutes = require('./src/routes/dashboard');
const notificationRoutes = require('./src/routes/notifications');
const calendarModule = require('./src/routes/calendar');
const calendarRoutes = calendarModule.router || calendarModule;
const calendarMonthHandler = calendarModule.monthHandler;
const auditLogRoutes = require('./src/routes/auditLogs');
const publicRoutes = require('./src/routes/public');
const twofaRoutes = require('./src/routes/twofa');
const adminSettingsRoutes = require('./src/routes/admin-settings');
const directMessagesRoutes = require('./src/routes/direct-messages');
const directionMessagesRoutes = require('./src/routes/direction-messages');
const projectMessagesRoutes = require('./src/routes/project-messages');
const eventsRoutes = require('./src/routes/events');
const pushTokensRoutes = require('./src/routes/pushTokens');
const projectsRoutes   = require('./src/routes/projects');
const superAdminRoutes = require('./src/routes/super-admin');
const { createDatabaseBackup } = require('./src/services/backup.service');
const { initRealtime } = require('./src/realtime/socket');

const app = express();
const httpServer = http.createServer(app);
const prisma = new PrismaClient();

// Security — headers globaux (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
// CSP gérée séparément ci-dessous pour exclure /api/docs
app.use(helmet({
    contentSecurityPolicy: false,
}));

// CSP activée sur toutes les routes SAUF /api/docs (Swagger UI nécessite des scripts/styles inline)
app.use((req, res, next) => {
    if (req.path.startsWith('/api/docs')) return next();

    const isProd = process.env.NODE_ENV === 'production';
    const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

    const directives = {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],   // inline styles tolérés (emails, public.js)
        imgSrc:      ["'self'", 'data:', 'https:'],   // avatars uploadés + icônes HTTPS
        connectSrc:  ["'self'", frontendOrigin],      // appels API depuis le frontend
        fontSrc:     ["'self'"],
        objectSrc:   ["'none'"],
        frameAncestors: ["'none'"],                   // anti-clickjacking
        ...(isProd && { upgradeInsecureRequests: [] }),// force HTTPS en production uniquement
    };

    helmet.contentSecurityPolicy({ directives })(req, res, next);
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Rate limiting – brute force protection (CDC §5.2)
const loginLimiter = rateLimit({
    windowMs: (parseInt(process.env.LOGIN_BLOCK_DURATION) || 15) * 60 * 1000,
    max: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    keyGenerator: (req) => `${ipKeyGenerator(req)}-${(req.body?.email || '').toLowerCase()}`,
    message: { error: 'Trop de tentatives de connexion. Compte temporairement bloqué (15 min).' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// Limite de 5 tentatives par tempToken sur la vérification 2FA (brute-force TOTP)
const twoFaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.MAX_2FA_ATTEMPTS) || 5,
    keyGenerator: (req) => {
        // Clé = tempToken (identifie la session 2FA) + IP en fallback
        const token = (req.body?.tempToken || '').slice(-32); // derniers 32 chars suffisent comme clé
        return token || ipKeyGenerator(req);
    },
    message: { error: 'Trop de tentatives 2FA. Ce code a été invalidé. Veuillez vous reconnecter.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { error: 'Trop de requêtes. Réessayez dans une minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const userId = req.user?.id || null;
        logger.logRequest(req.method, req.path, res.statusCode, duration, userId);
    });
    next();
});

// Expose Prisma to routes
app.use((req, res, next) => {
    req.prisma = prisma;
    next();
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Vérifier l'état du serveur
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Serveur opérationnel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 uptime:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Swagger documentation (protégé par Basic Auth en production)
app.use('/api/docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Gestion Planning API Docs',
    customCss: `
        .swagger-ui .topbar { background-color: #1F5C8B; }
        .swagger-ui .topbar-wrapper img { display: none; }
        .swagger-ui .topbar-wrapper::after { content: 'Gestion Planning API'; color: white; font-size: 1.2em; font-weight: bold; }
    `,
    swaggerOptions: {
        persistAuthorization: true,
    },
}));

// Routes publiques
app.use('/api/auth/login', loginLimiter);      // brute-force protection (CDC §5.2)
app.use('/api/auth/2fa-login', twoFaLimiter);  // brute-force TOTP protection
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
const profileRoutes = require('./src/routes/profile');
app.use('/api/profile', authMiddleware, profileRoutes); // CDC §4.4.2

// Routes protégées (auth requise)
app.use('/api/plannings', authMiddleware, planningRoutes);
app.use('/api/meetings', authMiddleware, meetingRoutes);
app.use('/api/missions', authMiddleware, missionRoutes);
app.use('/api/rooms', authMiddleware, roomRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/role-config', authMiddleware, roleConfigRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
// Routes calendrier : enregistrement explicite pour éviter 404
if (calendarMonthHandler) {
    app.get('/api/calendar/month', authMiddleware, calendarMonthHandler);
}
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/audit-logs', authMiddleware, auditLogRoutes);
app.use('/api/2fa', authMiddleware, twofaRoutes);
app.use('/api/admin/settings', authMiddleware, adminSettingsRoutes);
app.use('/api/direct-messages', authMiddleware, directMessagesRoutes);
app.use('/api/direction-messages', authMiddleware, directionMessagesRoutes);
app.use('/api/project-messages', authMiddleware, projectMessagesRoutes);
app.use('/api/events', authMiddleware, eventsRoutes);
app.use('/api/push',     authMiddleware, pushTokensRoutes);
app.use('/api/projects', authMiddleware, projectsRoutes);
app.use('/api/super-admin', authMiddleware, superAdminRoutes);
const repertoireRoutes = require('./src/routes/repertoire');
app.use('/api/repertoire', repertoireRoutes);

// 404 pour les routes API non trouvées (après toutes les routes)
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('UNHANDLED_ERROR', err.message, {
        stack: err.stack?.split('\n').slice(0, 3).join(' '),
        method: req.method,
        path: req.path,
        userId: req.user?.id || null,
    });
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT, 10) || 3001;
/** Interface d’écoute (127.0.0.1 = local uniquement ; le frontend proxy /api vers ce socket). */
const HOST = process.env.HOST || '127.0.0.1';

// Plusieurs origines possibles (ex. Vite sur :9000, preview sur :4173) — séparées par des virgules
const socketCorsOrigins = (process.env.FRONTEND_URL
    || 'http://localhost:5173,http://localhost:9000,http://127.0.0.1:9000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
initRealtime(httpServer, socketCorsOrigins.length === 1 ? socketCorsOrigins[0] : socketCorsOrigins);

httpServer.listen(PORT, HOST, () => {
    const baseUrl = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
    logger.info('SERVER_START', `Serveur démarré sur ${HOST}:${PORT}`, {
        host: HOST,
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        timezone: APP_TIMEZONE,
        tz: process.env.TZ,
        swaggerUrl: `${baseUrl}/api/docs`,
    });
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Swagger docs: ${baseUrl}/api/docs`);

    // Seed des types d'événement par défaut (REUNION, MISSION, ATELIER, …) — idempotent
    if (typeof eventsRoutes.ensureDefaultEventTypes === 'function') {
        eventsRoutes.ensureDefaultEventTypes(prisma)
            .then(({ created, existed }) => {
                if (created.length) {
                    logger.info(
                        'EVENT_TYPES_SEED',
                        `Types d'événement créés : ${created.join(', ')}`,
                        { created, existed },
                    );
                }
            })
            .catch((err) => {
                logger.error('EVENT_TYPES_SEED', err.message, { stack: err.stack });
            });
    }

    const cronTz = cronTimezoneOptions();

    // Cron : rapport hebdomadaire chaque lundi à 8h00 heure de Dakar (CDC §3.10)
    cron.schedule('0 8 * * 1', () => {
        runWeeklyReport(prisma).catch((err) => {
            logger.error('CRON_WEEKLY_REPORT', err.message, { stack: err.stack });
        });
    }, cronTz);
    // Cron : rappels réunions J-1 chaque jour à 8h00 heure de Dakar (CDC §3.3.2)
    cron.schedule('0 8 * * *', () => {
        runMeetingReminders(prisma).catch((err) => {
            logger.error('CRON_MEETING_REMINDERS', err.message, { stack: err.stack });
        });
    }, cronTz);
    // Cron : digest notifications (toutes les heures, heure de Dakar)
    cron.schedule('0 * * * *', () => {
        runDailyDigest(prisma).catch((err) => {
            logger.error('CRON_DAILY_DIGEST', err.message, { stack: err.stack });
        });
    }, cronTz);
    // Cron : auto-fermeture des réunions expirées (toutes les 5 minutes)
    cron.schedule('*/5 * * * *', () => {
        runMeetingAutoClose(prisma).catch((err) => {
            logger.error('CRON_MEETING_AUTO_CLOSE', err.message, { stack: err.stack });
        });
    }, cronTz);
    // Cron : sauvegarde PostgreSQL périodique (cron configurable, fuseau optionnel)
    if (process.env.DISABLE_BACKUP_CRON !== 'true') {
        const backupCronExpression = process.env.BACKUP_CRON_EXPRESSION || '0 0 * * 0';
        if (!cron.validate(backupCronExpression)) {
            logger.error(
                'CRON_BACKUP_INVALID_EXPRESSION',
                `Expression BACKUP_CRON_EXPRESSION invalide: ${backupCronExpression}`,
            );
        } else {
            const runScheduledBackup = () => {
                createDatabaseBackup(prisma, { kind: 'SCHEDULED' }).catch((err) => {
                    logger.error('CRON_BACKUP_SCHEDULED', err.message, { stack: err.stack });
                });
            };
            cron.schedule(backupCronExpression, runScheduledBackup, {
                timezone: process.env.BACKUP_CRON_TIMEZONE || APP_TIMEZONE,
            });
        }
    }
    logger.info(
        'CRON_REGISTERED',
        `Crons (fuseau ${APP_TIMEZONE}): rapport hebdo + rappels réunions + digest + auto-fermeture + sauvegarde`,
    );
});

// Handle shutdown
process.on('SIGINT', async () => {
    logger.info('SERVER_STOP', 'Arrêt du serveur');
    await prisma.$disconnect();
    process.exit(0);
});
