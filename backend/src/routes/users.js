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
const { normalizeStoredRole } = require('../config/roles');
const { validateUserRoleForDirection } = require('../services/roleConfig.service');
const { syncDirectionDiscussionMembers } = require('../services/directionDiscussion.service');
const { syncProjectDiscussionMembers } = require('../services/projectDiscussion.service');
const {
    assignUserAsProjectResponsible,
    clearProjectResponsibleIfUser,
} = require('../services/projectResponsible.service');
const { clearProjectCoordinatorIfUser } = require('../services/projectCoordinator.service');
const { clearProjectConsolidatorIfUser } = require('../services/projectConsolidator.service');
const {
    purgeUserAccount,
    deleteUserCompletely,
    findUserByEmail,
    normalizeEmail,
    toPublicUser,
    emailConflictPayload,
    PUBLIC_USER_SELECT,
} = require('../services/userDeletion.service');
const {
    validatePasswordStrength,
    createPasswordResetToken,
    buildPasswordResetUrl,
} = require('../utils/passwordUtils');

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
 *                 enum: [RESPONSABLE, COORDINATEUR, CONSOLIDATEUR, COORDINATEUR_PROJET, SECRETAIRE_GENERAL, DG, ADMIN, SUPER_ADMIN]
 *               password:
 *                 type: string
 *                 description: Mot de passe initial (min 8 caractères)
 */
router.post('/', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        const { name, email, role, password, directionId, projectId, phone, jobTitle, cellUnit } = req.body;

        const storedRole = normalizeStoredRole(role);
        if (!isValidRole(storedRole)) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        const roleDirCheck = await validateUserRoleForDirection(
            req.prisma, storedRole, directionId || null, jobTitle,
        );
        if (!roleDirCheck.ok) return res.status(400).json({ error: roleDirCheck.error });

        if (storedRole === ROLES.SUPER_ADMIN) {
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

        const emailNorm = normalizeEmail(email);
        if (!emailNorm) {
            return res.status(400).json({ error: 'Email requis' });
        }

        const existingUser = await findUserByEmail(req.prisma, emailNorm);
        if (existingUser && !existingUser.isDeleted) {
            return res.status(409).json(
                emailConflictPayload(existingUser, 'Un utilisateur avec cet email existe déjà'),
            );
        }

        // Compte soft-supprimé : réactivation sur la même fiche (évite P2002)
        if (existingUser?.isDeleted) {
            const hashedPassword = await bcrypt.hash(password, 12);
            const restored = await req.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    name: name || existingUser.name,
                    email: emailNorm,
                    role: storedRole,
                    passwordHash: hashedPassword,
                    isDeleted: false,
                    isActive: false,
                    directionId: directionId || null,
                    projectId: projectId || null,
                    phone: clipUserText(phone, MAX_USER_PHONE) ?? existingUser.phone,
                    jobTitle: clipUserText(jobTitle, MAX_USER_JOB_TITLE) ?? existingUser.jobTitle,
                    cellUnit: clipUserText(cellUnit, MAX_USER_CELL_UNIT) ?? existingUser.cellUnit,
                    twoFactorSecret: null,
                    twoFactorEnabled: false,
                    createdAt: new Date(),
                },
                select: PUBLIC_USER_SELECT,
            });

            if (restored.directionId) {
                await syncDirectionDiscussionMembers(req.prisma, restored.directionId);
            }
            if (restored.projectId) {
                await syncProjectDiscussionMembers(req.prisma, restored.projectId);
                if (restored.role === ROLES.RESPONSABLE) {
                    await assignUserAsProjectResponsible(req.prisma, restored.projectId, restored.id);
                }
            }

            const activationToken = jwt.sign(
                { id: restored.id, purpose: 'account_activation' },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_ACTIVATION_EXPIRY || '7d' },
            );
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const activationUrl = `${frontendUrl}/activate-account?token=${encodeURIComponent(activationToken)}`;
            await notificationService.sendEmail(emailNorm, 'ACCOUNT_ACTIVATION', [restored, activationUrl, password]);
            await createAuditLog(req, 'RESTORE_USER', 'User', restored.id, `Compte réactivé pour ${emailNorm}`);

            return res.status(200).json({
                ...toPublicUser(restored),
                restored: true,
                message: 'Un ancien compte avec cet e-mail a été réactivé.',
            });
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
                email: emailNorm,
                role: storedRole,
                passwordHash: hashedPassword,
                isActive: false,
                directionId: directionId || null,
                projectId: projectId || null,
                phone: clipUserText(phone, MAX_USER_PHONE) ?? null,
                jobTitle: clipUserText(jobTitle, MAX_USER_JOB_TITLE) ?? null,
                cellUnit: clipUserText(cellUnit, MAX_USER_CELL_UNIT) ?? null,
                createdAt: new Date(),
            },
        });

        if (user.directionId) {
            await syncDirectionDiscussionMembers(req.prisma, user.directionId);
        }
        if (user.projectId && user.role === ROLES.RESPONSABLE) {
            await syncProjectDiscussionMembers(req.prisma, user.projectId);
            await assignUserAsProjectResponsible(req.prisma, user.projectId, user.id);
        } else if (user.projectId) {
            await syncProjectDiscussionMembers(req.prisma, user.projectId);
        }

        logger.info('USER_CREATED', `Utilisateur ${emailNorm} créé par admin ${req.user.id}`, {
            userId: user.id, adminId: req.user.id,
        });

        await createAuditLog(req, 'CREATE_USER', 'User', user.id, `Utilisateur ${emailNorm} créé (en attente d'activation)`);

        const activationToken = jwt.sign(
            { id: user.id, purpose: 'account_activation' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_ACTIVATION_EXPIRY || '7d' }
        );
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const activationUrl = `${frontendUrl}/activate-account?token=${encodeURIComponent(activationToken)}`;

        await notificationService.sendEmail(emailNorm, 'ACCOUNT_ACTIVATION', [user, activationUrl, password]);

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
        if (error?.code === 'P2002') {
            const conflict = await findUserByEmail(req.prisma, req.body?.email);
            if (conflict) {
                return res.status(409).json(
                    emailConflictPayload(conflict, 'Un utilisateur avec cet email existe déjà'),
                );
            }
        }
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

        const storedRole = role ? normalizeStoredRole(role) : null;
        if (storedRole && !isValidRole(storedRole)) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        const targetUser = await req.prisma.user.findUnique({ where: { id: req.params.id } });
        if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        let nextDirectionId = directionId === undefined ? targetUser.directionId : (directionId || null);
        const nextJobTitle = jobTitle !== undefined ? jobTitle : targetUser.jobTitle;
        if (storedRole) {
            const roleDirCheck = await validateUserRoleForDirection(
                req.prisma, storedRole, nextDirectionId, nextJobTitle,
            );
            if (!roleDirCheck.ok) return res.status(400).json({ error: roleDirCheck.error });
        }

        if (storedRole === ROLES.SUPER_ADMIN) {
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
        if (targetUser.id === req.user.id && storedRole && !isPrivilegedAdmin(storedRole)) {
            return res.status(400).json({ error: 'Vous ne pouvez pas retirer votre propre rôle d’administrateur' });
        }

        if (isPrivilegedAdmin(targetUser.role) && storedRole && !isPrivilegedAdmin(storedRole)) {
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

        let emailNorm;
        if (email !== undefined && email !== null && String(email).trim() !== '') {
            emailNorm = normalizeEmail(email);
            if (emailNorm !== normalizeEmail(targetUser.email)) {
                const conflict = await findUserByEmail(req.prisma, emailNorm, { excludeId: targetUser.id });
                if (conflict) {
                    return res.status(409).json(
                        emailConflictPayload(
                            conflict,
                            `Cet e-mail est déjà utilisé par ${conflict.name} (${conflict.email})`,
                        ),
                    );
                }
            }
        }

        const updateData = {
            name: name || undefined,
            email: emailNorm || undefined,
            role: storedRole || undefined,
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

        nextDirectionId = updated.directionId || null;
        if (previousDirectionId && previousDirectionId !== nextDirectionId) {
            await syncDirectionDiscussionMembers(req.prisma, previousDirectionId);
        }
        if (nextDirectionId) {
            await syncDirectionDiscussionMembers(req.prisma, nextDirectionId);
        }

        const nextProjectId = updated.projectId || null;
        if (previousProjectId && previousProjectId !== nextProjectId) {
            await syncProjectDiscussionMembers(req.prisma, previousProjectId);
            await clearProjectResponsibleIfUser(req.prisma, previousProjectId, updated.id);
        }
        if (nextProjectId) {
            await syncProjectDiscussionMembers(req.prisma, nextProjectId);
            if (updated.role === ROLES.RESPONSABLE) {
                await assignUserAsProjectResponsible(req.prisma, nextProjectId, updated.id);
            }
        }

        const nextStoredRole = normalizeStoredRole(updated.role);
        const previousStoredRole = normalizeStoredRole(previousRole);
        if (storedRole && nextStoredRole !== previousStoredRole) {
            if (previousStoredRole === ROLES.COORDINATEUR && nextStoredRole !== ROLES.COORDINATEUR) {
                await clearProjectCoordinatorIfUser(req.prisma, updated.id);
            }
            if (previousStoredRole === ROLES.CONSOLIDATEUR && nextStoredRole !== ROLES.CONSOLIDATEUR) {
                const projects = await req.prisma.project.findMany({
                    where: { consolidatorId: updated.id },
                    select: { id: true },
                });
                for (const project of projects) {
                    await clearProjectConsolidatorIfUser(req.prisma, project.id, updated.id);
                }
            }
            if (previousStoredRole === ROLES.RESPONSABLE && nextStoredRole !== ROLES.RESPONSABLE) {
                const projects = await req.prisma.project.findMany({
                    where: { responsibleId: updated.id },
                    select: { id: true },
                });
                for (const project of projects) {
                    await clearProjectResponsibleIfUser(req.prisma, project.id, updated.id);
                }
            }
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
        if (error?.code === 'P2002') {
            const conflict = await findUserByEmail(req.prisma, req.body?.email, { excludeId: req.params.id });
            if (conflict) {
                return res.status(409).json(
                    emailConflictPayload(
                        conflict,
                        `Cet e-mail est déjà utilisé par ${conflict.name} (${conflict.email})`,
                    ),
                );
            }
        }
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

        const resetToken = createPasswordResetToken(user);
        const resetUrl = buildPasswordResetUrl(resetToken);
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

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) return res.status(400).json({ error: strengthError });

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
 * DELETE /api/users/:id — Suppression
 * - défaut : anonymisation + libération de l'e-mail
 * - ?permanent=1 : suppression définitive si aucun historique bloquant, sinon anonymisation
 */
router.delete('/:id', roleMiddleware(ADMIN_ROUTE_ROLES), async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
        }
        const permanent = String(req.query.permanent || '') === '1'
            || String(req.query.hard || '') === '1'
            || Boolean(req.body?.permanent);

        const target = await req.prisma.user.findUnique({ where: { id: req.params.id } });
        if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        if (target.isDeleted && !permanent) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (!target.isDeleted && isPrivilegedAdmin(target.role)) {
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

        if (permanent) {
            const result = await deleteUserCompletely(req.prisma, target);
            await createAuditLog(
                req,
                result.hardDeleted ? 'HARD_DELETE_USER' : 'DELETE_USER',
                'User',
                req.params.id,
                result.hardDeleted
                    ? `Suppression définitive de ${result.originalEmail}`
                    : `Anonymisation de ${result.originalEmail} (e-mail libéré)`,
            );
            return res.json({
                success: true,
                ...result,
                existingUser: result.hardDeleted ? null : undefined,
            });
        }

        const { deletedEmail, originalEmail } = await purgeUserAccount(req.prisma, target);
        await createAuditLog(
            req,
            'DELETE_USER',
            'User',
            req.params.id,
            `Suppression utilisateur ${originalEmail} (e-mail libéré : ${deletedEmail})`,
        );
        res.json({ success: true, emailReleased: true, hardDeleted: false, originalEmail });
    } catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({
                error: 'Impossible de libérer l\'e-mail (conflit unique). Réessayez ou utilisez la suppression définitive (?permanent=1).',
                code: 'EMAIL_ALREADY_USED',
            });
        }
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
