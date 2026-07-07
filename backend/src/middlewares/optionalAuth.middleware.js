const jwt = require('jsonwebtoken');
const { enrichReqUser } = require('../services/roleConfig.service');

/**
 * Décode le JWT si présent, sans bloquer les routes publiques.
 * Permet d’associer l’utilisateur aux journaux d’audit sur toutes les requêtes.
 */
async function optionalAuthMiddleware(req, res, next) {
    if (req.user?.id) return next();

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (req.prisma) {
            req.user = await enrichReqUser(req.prisma, decoded);
        } else {
            req.user = decoded;
        }
    } catch {
        // Token invalide ou expiré : requête traitée comme anonyme pour le journal
    }
    next();
}

module.exports = optionalAuthMiddleware;
