const express = require('express');
const roleMiddleware = require('../middlewares/role.middleware');
const { ADMIN_ROUTE_ROLES } = require('../config/roles');
const {
    getFullRoleConfig,
    setRoleDirectionRules,
    setAdminElevationConfig,
    setFunctionalElevationsConfig,
} = require('../services/roleConfig.service');

const router = express.Router();

router.get('/', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const config = await getFullRoleConfig(req.prisma);
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const { rules, adminElevation, functionalElevations } = req.body || {};
        if (rules) {
            await setRoleDirectionRules(req.prisma, rules);
        }
        if (functionalElevations) {
            await setFunctionalElevationsConfig(req.prisma, functionalElevations);
        } else if (adminElevation) {
            await setAdminElevationConfig(req.prisma, adminElevation);
        }
        const config = await getFullRoleConfig(req.prisma);
        res.json(config);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
