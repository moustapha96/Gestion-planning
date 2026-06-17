/**
 * Point d'entrée PM2 à la racine du dépôt.
 * Usage : pm2 start ecosystem.config.cjs
 */
module.exports = require('./deploy/pm2/ecosystem.config.cjs');
