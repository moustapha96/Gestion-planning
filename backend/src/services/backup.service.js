const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { logger } = require('../utils/logger');
const { notificationService } = require('./notification.service');

const DEFAULT_NOTIFY_EMAIL = 'alhusseinkhouma0@gmail.com';

function getBackupNotifyEmail() {
    return (process.env.BACKUP_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL).trim();
}

function getBackupsDir() {
    return path.join(__dirname, '../../backups');
}

function ensureBackupsDir() {
    const dir = getBackupsDir();
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/**
 * Parse postgresql://user:pass@host:port/db?params
 */
function parseDatabaseUrl(databaseUrl) {
    if (!databaseUrl) throw new Error('DATABASE_URL manquant');
    const u = new URL(databaseUrl);
    const database = (u.pathname || '/').replace(/^\//, '').split('?')[0];
    if (!database) throw new Error('Nom de base introuvable dans DATABASE_URL');
    return {
        host: u.hostname,
        port: u.port || '5432',
        user: decodeURIComponent(u.username || ''),
        password: decodeURIComponent(u.password || ''),
        database,
    };
}

function formatBytes(n) {
    if (n == null || Number.isNaN(n)) return '-';
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(2)} Mo`;
}

function runCommand(cmd, args, { env, timeoutMs = 3_600_000 } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            env: env || process.env,
            windowsHide: true,
            shell: false,
        });
        let stderr = '';
        let stdout = '';
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.stdout.on('data', (d) => { stdout += d.toString(); });
        const timer = setTimeout(() => {
            try { child.kill('SIGTERM'); } catch { /* ignore */ }
            reject(new Error(`Commande expirée (${timeoutMs / 1000}s)`));
        }, timeoutMs);
        child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
        child.on('exit', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve({ stdout, stderr });
            else reject(new Error(stderr || stdout || `Code de sortie ${code}`));
        });
    });
}

function getPgDumpBinary() {
    return process.env.PG_DUMP_PATH || 'pg_dump';
}

function getPsqlBinary() {
    return process.env.PSQL_PATH || 'psql';
}

/**
 * Crée un dump SQL (plain) avec options pour restauration propre.
 */
async function runPgDumpToFile(outputPath) {
    const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
    const bin = getPgDumpBinary();
    const env = {
        ...process.env,
        PGPASSWORD: cfg.password,
    };
    const args = [
        '-h', cfg.host,
        '-p', String(cfg.port),
        '-U', cfg.user,
        '-d', cfg.database,
        '-F', 'p',
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        '-f', outputPath,
    ];
    await runCommand(bin, args, { env, timeoutMs: Number(process.env.BACKUP_TIMEOUT_MS) || 3_600_000 });
}

/**
 * Restauration depuis un fichier SQL (ATTENTION : écrase les objets existants selon le dump).
 */
async function runPsqlFromFile(inputPath) {
    const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
    const bin = getPsqlBinary();
    const env = {
        ...process.env,
        PGPASSWORD: cfg.password,
    };
    const args = [
        '-h', cfg.host,
        '-p', String(cfg.port),
        '-U', cfg.user,
        '-d', cfg.database,
        '-v', 'ON_ERROR_STOP=1',
        '-f', inputPath,
    ];
    await runCommand(bin, args, { env, timeoutMs: Number(process.env.BACKUP_RESTORE_TIMEOUT_MS) || 7_200_000 });
}

async function notifyBackupResult({ success, fileName, sizeBytes, durationMs, errorMessage, kind }) {
    const to = getBackupNotifyEmail();
    const kindLabel = kind === 'SCHEDULED' ? 'Planifiée' : 'Manuelle';
    const detail = {
        fileName: fileName || '—',
        sizeLabel: formatBytes(sizeBytes),
        durationSec: durationMs != null ? `${Math.round(durationMs / 1000)}` : '—',
        at: require('../config/timezone').formatFrDateTime(new Date()),
        kind: kindLabel,
        error: errorMessage || '',
    };
    try {
        if (success) {
            await notificationService.sendEmail(to, 'BACKUP_SUCCESS', [detail]);
        } else {
            await notificationService.sendEmail(to, 'BACKUP_FAILED', [detail]);
        }
    } catch (e) {
        logger.warn('BACKUP_EMAIL', `Email notification échouée: ${e.message}`);
    }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ userId?: string, kind?: 'MANUAL'|'SCHEDULED' }} opts
 */
async function createDatabaseBackup(prisma, opts = {}) {
    const started = Date.now();
    ensureBackupsDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `backup_${stamp}.sql`;
    const relativePath = path.join('backups', fileName);
    const absPath = path.join(getBackupsDir(), fileName);

    const record = await prisma.backup.create({
        data: {
            fileName,
            relativePath,
            status: 'PENDING',
            kind: opts.kind || 'MANUAL',
            createdById: opts.userId || null,
        },
    });

    try {
        await runPgDumpToFile(absPath);
        const stat = fs.statSync(absPath);
        const durationMs = Date.now() - started;
        await prisma.backup.update({
            where: { id: record.id },
            data: {
                status: 'SUCCESS',
                sizeBytes: stat.size,
                finishedAt: new Date(),
                errorMessage: null,
            },
        });
        await notifyBackupResult({
            success: true,
            fileName,
            sizeBytes: stat.size,
            durationMs,
            kind: opts.kind || 'MANUAL',
        });
        return prisma.backup.findUnique({ where: { id: record.id } });
    } catch (err) {
        const durationMs = Date.now() - started;
        const msg = err.message || String(err);
        logger.error('BACKUP_FAILED', msg, { backupId: record.id });
        try {
            if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
        } catch { /* ignore */ }
        await prisma.backup.update({
            where: { id: record.id },
            data: {
                status: 'FAILED',
                finishedAt: new Date(),
                errorMessage: msg.slice(0, 2000),
                sizeBytes: null,
            },
        });
        await notifyBackupResult({
            success: false,
            fileName,
            durationMs,
            errorMessage: msg,
            kind: opts.kind || 'MANUAL',
        });
        throw err;
    }
}

module.exports = {
    getBackupsDir,
    ensureBackupsDir,
    createDatabaseBackup,
    runPsqlFromFile,
    parseDatabaseUrl,
    getBackupNotifyEmail,
    formatBytes,
};
