/**
 * PM2 — Gestion Planning (production tech-xuma.com)
 *
 * Sur la VM :
 *   export GPADM_ROOT=/var/www/gpadm   # adapter si besoin
 *   cd "$GPADM_ROOT/backend"
 *   pm2 start ../deploy/pm2/ecosystem.config.cjs
 *   pm2 save
 *
 * Variables applicatives : backend/.env (dotenv dans server.js).
 * Redémarrage après changement .env :
 *   pm2 restart gp-backend --update-env
 */
const path = require('path');

const GPADM_ROOT = process.env.GPADM_ROOT || '/var/www/gpadm';
const BACKEND_DIR = path.join(GPADM_ROOT, 'backend');
const APP_NAME = process.env.PM2_APP_NAME || 'gp-backend';

module.exports = {
    apps: [
        {
            name: APP_NAME,
            script: 'server.js',
            cwd: BACKEND_DIR,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '600M',
            merge_logs: true,
            time: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            out_file: path.join(BACKEND_DIR, 'logs', 'pm2-out.log'),
            error_file: path.join(BACKEND_DIR, 'logs', 'pm2-error.log'),
            env: {
                NODE_ENV: 'production',
                TZ: 'Africa/Dakar',
                APP_TIMEZONE: 'Africa/Dakar',
            },
        },
    ],
};
