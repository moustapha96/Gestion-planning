const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const roleMiddleware = require('../middlewares/role.middleware');
const { logger } = require('../utils/logger');
const { notificationService } = require('../services/notification.service');
const { createAuditLog } = require('../utils/audit');
const {
    ROLES, isValidRole, ADMIN_ROUTE_ROLES, isPrivilegedAdmin, isSuperAdmin,
} = require('../config/roles');
const { ROLE_PERMISSIONS, ROLE_LABELS } = require('../config/rolePermissions');
const { syncDirectionDiscussionMembers } = require('../services/directionDiscussion.service');
const { syncProjectDiscussionMembers } = require('../services/projectDiscussion.service');

const router = express.Router();

const MAX_USER_PHONE = 40;
const MAX_USER_JOB_TITLE = 120;
const MAX_USER_CELL_UNIT = 120;

function clipUserText(v, maxLen) {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const t = String(v).trim();
    return t ? t.slice(0, maxLen) : null;
}

/**
 * GET /api/users/role-permissions - Permissions par rôle (ADMIN)
 */
router.get('/role-permissions', roleMiddleware(ADMIN_ROUTE_ROLES), (req, res) => {
    res.json({ roles: ROLE_PERMISSIONS, labels: ROLE_LABELS });
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs (ADMIN uniquement)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lister tous les utilisateurs
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const users = await req.prisma.user.findMany({
            where: { isDeleted: false }, // exclure les soft-deleted (CDC §3.9.1)
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                isDeleted: true,
                avatarUrl: true,
                createdAt: true,
                directionId: true,
                direction: { select: { id: true, name: true, code: true } },
                projectId: true,
                project: { select: { id: true, name: true, code: true } },
                phone: true,
                jobTitle: true,
                cellUnit: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Liste minimaliste des utilisateurs actifs pour les réunions (participants) - accessible à tout utilisateur authentifié
router.get('/participants', async (req, res) => {
    try {
        const users = await req.prisma.user.findMany({
            where: { isActive: true, isDeleted: false },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                phone: true,
                jobTitle: true,
                cellUnit: true,
                direction: { select: { id: true, name: true, code: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Créer un utilisateur (ADMIN) - envoie email de bienvenue
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, role, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [RESPONSABLE, CONSOLIDATEUR, COORDINATEUR_PROJET, SECRETAIRE_GENERAL, DG, ADMIN, SUPER_ADMIN]
 *               password:
 *                 type: string
 *                 description: Mot de passe initial (min 8 caractères)
 */
router.post('/', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const { name, email, role, password, directionId, projectId, phone, jobTitle, cellUnit } = req.body;

        if (!isValidRole(role)) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        if (role === ROLES.SUPER_ADMIN) {
            const superCount = await req.prisma.user.count({
                where: { role: ROLES.SUPER_ADMIN, isDeleted: false },
            });
            const allowBootstrap = req.user.role === ROLES.ADMIN && superCount === 0;
            if (!isSuperAdmin(req.user.role) && !allowBootstrap) {
                return res.status(403).json({
                    error: 'Seul un super administrateur peut attribuer le rôle Super administrateur (sauf premier compte : un administrateur peut créer le premier super admin si aucun n’existe).',
                });
            }
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
        }

        const existingUser = await req.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        if (directionId) {
            const direction = await req.prisma.direction.findUnique({
                where: { id: directionId },
                select: { id: true, isActive: true },
            });
            if (!direction || !direction.isActive) {
                return res.status(400).json({ error: 'Direction invalide ou inactive.' });
            }
        }

        if (projectId) {
            const project = await req.prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true, isActive: true, status: true },
            });
            if (!project || !project.isActive || project.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Projet invalide, inactif ou non actif.' });
            }
        }

        const user = await req.prisma.user.create({
            data: {
                name,
                email,
                role: role || ROLES.RESPONSABLE,
                passwordHash: hashedPassword,
                isActive: false,
                directionId: directionId || null,
                projectId: projectId || null,
                phone: clipUserText(phone, MAX_USER_PHONE) ?? null,
                jobTitle: clipUserText(jobTitle, MAX_USER_JOB_TITLE) ?? null,
                cellUnit: clipUserText(cellUnit, MAX_USER_CELL_UNIT) ?? null,
            },
        });

        if (user.directionId) {
            await syncDirectionDiscussionMembers(req.prisma, user.directionId);
        }
        if (user.projectId) {
            await syncProjectDiscussionMembers(req.prisma, user.projectId);
        }

        logger.info('USER_CREATED', `Utilisateur ${email} créé par admin ${req.user.id}`, {
            userId: user.id, adminId: req.user.id,
        });

        await createAuditLog(req, 'CREATE_USER', 'User', user.id, `Utilisateur ${email} créé (en attente d'activation)`);

        const activationToken = jwt.sign(
            { id: user.id, purpose: 'account_activation' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_ACTIVATION_EXPIRY || '7d' }
        );
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const activationUrl = `${frontendUrl}/activate-account?token=${encodeURIComponent(activationToken)}`;

        await notificationService.sendEmail(email, 'ACCOUNT_ACTIVATION', [user, activationUrl, password]);

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            directionId: user.directionId || null,
            projectId: user.projectId || null,
            phone: user.phone || null,
            jobTitle: user.jobTitle || null,
            cellUnit: user.cellUnit || null,
        });
    } catch (error) {
        logger.error('CREATE_USER', 'Erreur création utilisateur', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Modifier un utilisateur (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const { name, email, role, directionId, projectId, phone, jobTitle, cellUnit } = req.body;

        if (role && !isValidRole(role)) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        const targetUser = await req.prisma.user.findUnique({ where: { id: req.params.id } });
        if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        if (role === ROLES.SUPER_ADMIN) {
            const superCount = await req.prisma.user.count({
                where: { role: ROLES.SUPER_ADMIN, isDeleted: false },
            });
            const alreadySuper = targetUser.role === ROLES.SUPER_ADMIN;
            const allowBootstrap = req.user.role === ROLES.ADMIN && superCount === 0 && !alreadySuper;
            if (!isSuperAdmin(req.user.role) && !allowBootstrap) {
                return res.status(403).json({
                    error: 'Seul un super administrateur peut attribuer le rôle Super administrateur (sauf premier compte : un administrateur peut promouvoir le premier super admin si aucun n’existe).',
                });
            }
        }

        // Empêcher un admin privilégié de retirer son propre rôle sans autre admin/super admin actif
        if (targetUser.id === req.user.id && role && !isPrivilegedAdmin(role)) {
            return res.status(400).json({ error: 'Vous ne pouvez pas retirer votre propre rôle d’administrateur' });
        }

        if (isPrivilegedAdmin(targetUser.role) && role && !isPrivilegedAdmin(role)) {
            const activePrivileged = await req.prisma.user.count({
                where: {
                    role: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
                    isActive: true,
                    isDeleted: false,
                },
            });
            if (activePrivileged <= 1) {
                return res.status(400).json({ error: 'Impossible de retirer le rôle du dernier administrateur / super administrateur actif' });
            }
        }

        if (directionId !== undefined && directionId !== null && directionId !== '') {
            const direction = await req.prisma.direction.findUnique({
                where: { id: directionId },
                select: { id: true, isActive: true },
            });
            if (!direction || !direction.isActive) {
                return res.status(400).json({ error: 'Direction invalide ou inactive.' });
            }
        }

        if (projectId !== undefined && projectId !== null && projectId !== '') {
            const project = await req.prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true, isActive: true, status: true },
            });
            if (!project || !project.isActive || project.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Projet invalide, inactif ou non actif.' });
            }
        }

        const previousRole = targetUser.role;
        const previousDirectionId = targetUser.directionId || null;
        const previousProjectId = targetUser.projectId || null;
        const updateData = {
            name: name || undefined,
            email: email || undefined,
            role: role || undefined,
            directionId: directionId === undefined ? undefined : (directionId || null),
            projectId: projectId === undefined ? undefined : (projectId || null),
        };
        if (phone !== undefined) updateData.phone = clipUserText(phone, MAX_USER_PHONE);
        if (jobTitle !== undefined) updateData.jobTitle = clipUserText(jobTitle, MAX_USER_JOB_TITLE);
        if (cellUnit !== undefined) updateData.cellUnit = clipUserText(cellUnit, MAX_USER_CELL_UNIT);

        const updated = await req.prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                avatarUrl: true,
                directionId: true,
                direction: { select: { id: true, name: true, code: true } },
                projectId: true,
                project: { select: { id: true, name: true, code: true } },
                phone: true,
                jobTitle: true,
                cellUnit: true,
            },
        });

        const nextDirectionId = updated.directionId || null;
        if (previousDirectionId && previousDirectionId !== nextDirectionId) {
            await syncDirectionDiscussionMembers(req.prisma, previousDirectionId);
        }
        if (nextDirectionId) {
            await syncDirectionDiscussionMembers(req.prisma, nextDirectionId);
        }

        const nextProjectId = updated.projectId || null;
        if (previousProjectId && previousProjectId !== nextProjectId) {
            await syncProjectDiscussionMembers(req.prisma, previousProjectId);
        }
        if (nextProjectId) {
            await syncProjectDiscussionMembers(req.prisma, nextProjectId);
        }

        // Si le rôle a changé : email + notification in-app à l'utilisateur concerné
        if (role && previousRole !== role && updated.isActive) {
            const newRoleLabel = ROLE_LABELS[updated.role] || updated.role;
            const previousRoleLabel = ROLE_LABELS[previousRole] || previousRole;
            try {
                await notificationService.sendEmail(updated.email, 'ROLE_CHANGED', [updated, newRoleLabel, previousRoleLabel]);
                await notificationService.createNotification(
                    req.prisma,
                    updated.id,
                    'ROLE_CHANGED',
                    'Votre rôle a été modifié',
                    `Votre rôle est passé de "${previousRoleLabel}" à "${newRoleLabel}".`,
                    '/profile'
                );
            } catch (notifErr) {
                logger.warn('ROLE_CHANGE_NOTIF', 'Email ou notification non envoyé après changement de rôle', { userId: updated.id, error: notifErr.message });
            }
        }

        logger.info('USER_UPDATED', `Utilisateur ${req.params.id} modifié`, { adminId: req.user.id });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   put:
 *     summary: Désactiver un utilisateur (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/deactivate', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
        }

        const targetUser = await req.prisma.user.findUnique({ where: { id: req.params.id } });
        if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        if (isPrivilegedAdmin(targetUser.role) && targetUser.isActive) {
            const activePrivileged = await req.prisma.user.count({
                where: {
                    role: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
                    isActive: true,
                    isDeleted: false,
                },
            });
            if (activePrivileged <= 1) {
                return res.status(400).json({ error: 'Impossible de désactiver le dernier administrateur / super administrateur actif' });
            }
        }

        const updated = await req.prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: false },
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });

        // Notifier l'utilisateur par email et notification in-app
        try {
            await notificationService.sendEmail(updated.email, 'ACCOUNT_DEACTIVATED', [updated]);
            await notificationService.createNotification(
                req.prisma,
                updated.id,
                'ACCOUNT_DEACTIVATED',
                'Compte désactivé',
                'Votre compte a été désactivé par un administrateur. Vous ne pouvez plus vous connecter.',
                null
            );
        } catch (notifErr) {
            logger.warn('DEACTIVATE_NOTIF', 'Email ou notification non envoyé', { userId: updated.id, error: notifErr.message });
        }

        // Révoquer tous les tokens
        await req.prisma.refreshToken.updateMany({
            where: { userId: req.params.id },
            data: { isRevoked: true },
        });

        await createAuditLog(req, 'DEACTIVATE_USER', 'User', req.params.id, `Utilisateur désactivé`);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/users/{id}/activate:
 *   put:
 *     summary: Réactiver un utilisateur (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/activate', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const updated = await req.prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: true },
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });

        // Notifier l'utilisateur par email et notification in-app
        try {
            await notificationService.sendEmail(updated.email, 'ACCOUNT_ACTIVATED', [updated]);
            await notificationService.createNotification(
                req.prisma,
                updated.id,
                'ACCOUNT_ACTIVATED',
                'Compte réactivé',
                'Votre compte a été réactivé par un administrateur. Vous pouvez à nouveau vous connecter.',
                '/login'
            );
        } catch (notifErr) {
            logger.warn('ACTIVATE_NOTIF', 'Email ou notification non envoyé', { userId: updated.id, error: notifErr.message });
        }

        await createAuditLog(req, 'ACTIVATE_USER', 'User', req.params.id, `Utilisateur réactivé`);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   put:
 *     summary: Réinitialiser le mot de passe d'un utilisateur (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 */
/**
 * POST /api/users/:id/send-reset-link - Envoyer un lien de réinitialisation de mot de passe (ADMIN)
 */
router.post('/:id/send-reset-link', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const user = await req.prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, email: true, name: true, isActive: true, passwordHash: true },
        });
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        if (!user.isActive) return res.status(400).json({ error: 'Impossible d\'envoyer un lien à un compte désactivé' });

        const resetToken = jwt.sign(
            { id: user.id, purpose: 'password_reset' },
            process.env.JWT_SECRET + user.passwordHash.slice(-8),
            { expiresIn: '1h' }
        );
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
        const emailResult = await notificationService.sendEmail(user.email, 'PASSWORD_RESET', [user, resetUrl]);

        if (!emailResult || !emailResult.success) {
            const msg = emailResult?.error || 'Échec d\'envoi de l\'email';
            logger.error('SEND_RESET_LINK', msg, { userId: user.id, email: user.email });
            return res.status(502).json({ error: `L'email n'a pas pu être envoyé : ${msg}. Vérifiez la configuration SMTP (SMTP_HOST, SMTP_PORT, etc.).` });
        }

        await createAuditLog(req, 'SEND_RESET_LINK', 'User', user.id, `Lien de réinitialisation envoyé à ${user.email}`);
        res.json({ success: true, message: `Un lien de réinitialisation a été envoyé à ${user.email}` });
    } catch (err) {
        logger.error('SEND_RESET_LINK', err.message, { userId: req.params.id });
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/reset-password', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
        }

        const user = await req.prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const hash = await bcrypt.hash(newPassword, 12);
        await req.prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hash } });

        // Révoquer tous les tokens
        await req.prisma.refreshToken.updateMany({
            where: { userId: req.params.id },
            data: { isRevoked: true },
        });

        // Envoyer le nouveau mdp par email
        await notificationService.sendEmail(user.email, 'ACCOUNT_CREATED', [user, newPassword]);

        await createAuditLog(req, 'ADMIN_RESET_PASSWORD', 'User', req.params.id, `Mot de passe réinitialisé pour ${user.email}`);

        res.json({ success: true, message: 'Mot de passe réinitialisé et envoyé par email' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/users/:id — Soft-delete (isDeleted=true) — CDC §3.9.1
 * Préserve l'historique des données liées.
 */
router.delete('/:id', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
        }
        const target = await req.prisma.user.findUnique({ where: { id: req.params.id } });
        if (!target || target.isDeleted) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        if (isPrivilegedAdmin(target.role)) {
            const activePrivileged = await req.prisma.user.count({
                where: {
                    role: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
                    isActive: true,
                    isDeleted: false,
                },
            });
            if (activePrivileged <= 1) {
                return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur / super administrateur actif.' });
            }
        }

        await req.prisma.user.update({
            where: { id: req.params.id },
            data: { isDeleted: true, isActive: false },
        });
        // Révoquer tous les tokens actifs
        await req.prisma.refreshToken.updateMany({ where: { userId: req.params.id }, data: { isRevoked: true } });

        await createAuditLog(req, 'DELETE_USER', 'User', req.params.id, `Soft-delete utilisateur ${target.email}`);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
