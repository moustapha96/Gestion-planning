const jwt = require('jsonwebtoken');
const { enrichReqUser } = require('../services/roleConfig.service');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (req.prisma) {
            req.user = await enrichReqUser(req.prisma, decoded);
        } else {
            req.user = decoded;
        }
        next();
    } catch (error) {
        const code = error.statusCode || 401;
        return res.status(code).json({ error: error.message || 'Invalid token' });
    }
};

module.exports = authMiddleware;
