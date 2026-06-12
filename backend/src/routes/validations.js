const express = require('express');
const { logger } = require('../utils/logger');
const { getPendingValidations } = require('../services/validationQueue.service');

const router = express.Router();

/**
 * GET /api/validations/pending
 * File d'attente de validation pour consolidateurs et coordinateurs de projet.
 */
router.get('/pending', async (req, res) => {
    try {
        const data = await getPendingValidations(req.prisma, req.user);
        res.json(data);
    } catch (error) {
        logger.error('GET_PENDING_VALIDATIONS', error.message, { userId: req.user?.id });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
