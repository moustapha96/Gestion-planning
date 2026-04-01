require('dotenv').config();
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

const authRoutes = require('./src/routes/auth');
const planningRoutes = require('./src/routes/plannings');
const meetingRoutes = require('./src/routes/meetings');
const missionRoutes = require('./src/routes/missions');
const roomRoutes = require('./src/routes/rooms');
const userRoutes = require('./src/routes/users');
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
const eventsRoutes = require('./src/routes/events');
const pushTokensRoutes = require('./src/routes/pushTokens');
const projectsRoutes   = require('./src/routes/projects');
const superAdminRoutes = require('./src/routes/super-admin');
const { createDatabaseBackup } = require('./src/services/backup.service');
const { initRealtime } = require('./src/realtime/socket');

const app = express();
const httpServer = http.createServer(app);
const prisma = new PrismaClient();

// Security
app.use(helmet({
    contentSecurityPolicy: false, // Disable for Swagger UI
}));
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

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
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
app.use('/api/auth/login', loginLimiter); // brute-force protection (CDC §5.2)
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
app.use('/api/events', authMiddleware, eventsRoutes);
app.use('/api/push',     authMiddleware, pushTokensRoutes);
app.use('/api/projects', authMiddleware, projectsRoutes);
app.use('/api/super-admin', authMiddleware, superAdminRoutes);

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

const PORT = process.env.PORT || 3001;

// Plusieurs origines possibles (ex. Vite sur :9000, preview sur :4173) — séparées par des virgules
const socketCorsOrigins = (process.env.FRONTEND_URL
    || 'http://localhost:5173,http://localhost:9000,http://127.0.0.1:9000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
initRealtime(httpServer, socketCorsOrigins.length === 1 ? socketCorsOrigins[0] : socketCorsOrigins);

httpServer.listen(PORT, () => {
    logger.info('SERVER_START', `Serveur démarré sur le port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        swaggerUrl: `http://localhost:${PORT}/api/docs`,
    });
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);

    // Cron : rapport hebdomadaire chaque lundi à 8h00 (CDC §3.10)
    cron.schedule('0 8 * * 1', () => {
        runWeeklyReport(prisma).catch((err) => {
            logger.error('CRON_WEEKLY_REPORT', err.message, { stack: err.stack });
        });
    });
    // Cron : rappels réunions J-1 chaque jour à 8h00 (CDC §3.3.2)
    cron.schedule('0 8 * * *', () => {
        runMeetingReminders(prisma).catch((err) => {
            logger.error('CRON_MEETING_REMINDERS', err.message, { stack: err.stack });
        });
    });
    // Cron : digest notifications (toutes les heures, filtré par préférence utilisateur)
    cron.schedule('0 * * * *', () => {
        runDailyDigest(prisma).catch((err) => {
            logger.error('CRON_DAILY_DIGEST', err.message, { stack: err.stack });
        });
    });
    // Cron : auto-fermeture des réunions expirées (toutes les 5 minutes)
    cron.schedule('*/5 * * * *', () => {
        runMeetingAutoClose(prisma).catch((err) => {
            logger.error('CRON_MEETING_AUTO_CLOSE', err.message, { stack: err.stack });
        });
    });
    // Cron : sauvegarde PostgreSQL chaque dimanche à 00h00 (fuseau : BACKUP_CRON_TIMEZONE, sinon horloge du serveur)
    if (process.env.DISABLE_BACKUP_CRON !== 'true') {
        const runScheduledBackup = () => {
            createDatabaseBackup(prisma, { kind: 'SCHEDULED' }).catch((err) => {
                logger.error('CRON_BACKUP_SCHEDULED', err.message, { stack: err.stack });
            });
        };
        if (process.env.BACKUP_CRON_TIMEZONE) {
            cron.schedule('0 0 * * 0', runScheduledBackup, {
                timezone: process.env.BACKUP_CRON_TIMEZONE,
            });
        } else {
            cron.schedule('0 0 * * 0', runScheduledBackup);
        }
    }
    logger.info(
        'CRON_REGISTERED',
        'Crons: rapport hebdo + rappels réunions + digest + auto-fermeture réunions + sauvegarde dimanche 00h (si activée)',
    );
});

// Handle shutdown
process.on('SIGINT', async () => {
    logger.info('SERVER_STOP', 'Arrêt du serveur');
    await prisma.$disconnect();
    process.exit(0);
});
