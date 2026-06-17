/**
 * PM2 — backend Gestion Planning (délègue à deploy/pm2/)
 *
 * Sur la VM :
 *   cd /var/www/gpadm/backend
 *   pm2 start ../deploy/pm2/ecosystem.config.cjs
 *   # ou depuis la racine :
 *   pm2 start ecosystem.config.cjs
 *
 * Variables lues depuis backend/.env (dotenv dans server.js).
 */
module.exports = require('../deploy/pm2/ecosystem.config.cjs');
