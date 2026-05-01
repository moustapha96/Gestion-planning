const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Middleware de protection de la documentation Swagger.
 *
 * - En développement (NODE_ENV !== 'production') : accès libre, aucune restriction.
 * - En production : authentification HTTP Basic obligatoire.
 *   Les credentials sont comparés en temps constant (timingSafeEqual)
 *   pour résister aux timing attacks.
 *
 * Variables d'environnement requises en production :
 *   SWAGGER_USER  — identifiant
 *   SWAGGER_PASS  — mot de passe
 */
const swaggerAuth = (req, res, next) => {
    // Hors production : accès libre
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    const swaggerUser = process.env.SWAGGER_USER;
    const swaggerPass = process.env.SWAGGER_PASS;

    // Fail-safe : si les variables ne sont pas configurées en prod, bloquer tout accès
    if (!swaggerUser || !swaggerPass) {
        logger.warn('SWAGGER_AUTH', 'SWAGGER_USER ou SWAGGER_PASS non définis en production — accès /api/docs bloqué', {
            ip: req.ip,
        });
        return res.status(503).send('Documentation indisponible (configuration manquante).');
    }

    const authHeader = req.headers.authorization || '';

    // Vérifier le schéma Basic
    if (!authHeader.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="API Docs", charset="UTF-8"');
        logger.warn('SWAGGER_AUTH', 'Tentative d\'accès /api/docs sans credentials', { ip: req.ip });
        return res.status(401).send('Authentification requise pour accéder à la documentation API.');
    }

    // Décoder les credentials fournis
    let providedUser, providedPass;
    try {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) throw new Error('Format invalide');
        providedUser = decoded.slice(0, colonIndex);
        providedPass = decoded.slice(colonIndex + 1);
    } catch {
        res.set('WWW-Authenticate', 'Basic realm="API Docs", charset="UTF-8"');
        return res.status(401).send('Authentification invalide.');
    }

    // Comparaison en temps constant — résiste aux timing attacks
    const expectedUser = Buffer.from(swaggerUser, 'utf8');
    const expectedPass = Buffer.from(swaggerPass, 'utf8');
    const givenUser = Buffer.from(providedUser, 'utf8');
    const givenPass = Buffer.from(providedPass, 'utf8');

    const userMatch =
        givenUser.length === expectedUser.length &&
        crypto.timingSafeEqual(givenUser, expectedUser);

    const passMatch =
        givenPass.length === expectedPass.length &&
        crypto.timingSafeEqual(givenPass, expectedPass);

    if (!userMatch || !passMatch) {
        res.set('WWW-Authenticate', 'Basic realm="API Docs", charset="UTF-8"');
        logger.warn('SWAGGER_AUTH_FAILED', 'Échec d\'authentification sur /api/docs', {
            ip: req.ip,
            user: providedUser, // logguer l'identifiant tenté (pas le mot de passe)
        });
        return res.status(401).send('Identifiants incorrects.');
    }

    next();
};

module.exports = swaggerAuth;
