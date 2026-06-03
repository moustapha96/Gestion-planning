/**
 * PM2 — backend Gestion Planning
 * Usage sur la VM :
 *   cd /var/www/gpadm/backend
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart ecosystem.config.cjs --update-env
 *
 * Variables lues depuis backend/.env (dotenv dans server.js).
 */
const path = require('path');

const appName = process.env.PM2_APP_NAME || 'backend';

module.exports = {
    apps: [
        {
            name: appName,
            script: 'server.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '600M',
            merge_logs: true,
            time: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
            error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
            env: {
                NODE_ENV: 'production',
                TZ: 'Africa/Dakar',
                APP_TIMEZONE: 'Africa/Dakar',
            },
        },
    ],
};
