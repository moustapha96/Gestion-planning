const { ROLES, normalizeStoredRole } = require('../config/roles');
const {
    ATTACHMENT_ERRORS,
    isDirectionExclusiveRole,
    isEligibleDirectionDirector,
    directorRoleToKeep,
    assertExclusiveAttachment,
} = require('../config/directorWorkflow');

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    jobTitle: true,
    directionId: true,
    isActive: true,
    isDeleted: true,
};

function attachmentError(message, status = 409, code = 'ATTACHMENT_CONFLICT') {
    const err = new Error(message);
    err.statusCode = status;
    err.code = code;
    return err;
}

async function loadUser(prisma, userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: { ...USER_SELECT, directedDirection: { select: { id: true, name: true } } },
    });
}

async function loadDirection(prisma, directionId) {
    return prisma.direction.findUnique({
        where: { id: directionId },
        select: {
            id: true,
            name: true,
            isActive: true,
            directorId: true,
            director: { select: USER_SELECT },
        },
    });
}

async function getDirectorForDirection(prisma, directionId) {
    if (!directionId) return null;
    const direction = await prisma.direction.findUnique({
        where: { id: directionId },
        select: {
            id: true,
            name: true,
            directorId: true,
            director: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    jobTitle: true,
                    directionId: true,
                    isActive: true,
                    isDeleted: true,
                },
            },
        },
    });
    const director = direction?.director;
    if (!director || director.isDeleted || !director.isActive) return null;
    if (!isEligibleDirectionDirector(director)) return null;
    if (director.directionId && director.directionId !== direction.id) return null;
    return { direction, director };
}

/**
 * Refuse tout rattachement DG/ASSISTANT incohérent.
 * @param {{ replaceExisting?: boolean }} [opts]
 */
async function assertCanAttach(prisma, userId, targetDirectionId, targetRole, opts = {}) {
    const user = await loadUser(prisma, userId);
    if (!user || user.isDeleted) {
        throw attachmentError('Utilisateur introuvable.', 404, 'USER_NOT_FOUND');
    }
    const direction = await loadDirection(prisma, targetDirectionId);
    if (!direction) {
        throw attachmentError('Direction introuvable.', 404, 'DIRECTION_NOT_FOUND');
    }
    // Unicité : toujours le rôle / direction actuels en base.
    const userForExclusivity = {
        ...user,
        directionId: opts.ignoreCurrentDirection ? null : user.directionId,
    };
    const check = assertExclusiveAttachment(
        userForExclusivity,
        targetDirectionId,
        targetRole,
        { currentDirectorId: direction.directorId, replaceExisting: Boolean(opts.replaceExisting) },
    );
    if (!check.ok) {
        throw attachmentError(check.error, 409, check.code);
    }
    // Éligibilité DG : tenir compte du rôle cible (promotion RESPONSABLE → DG).
    const roleForEligibility = opts.pendingRole || user.role;
    if (targetRole === ROLES.DG && !isEligibleDirectionDirector({ ...user, role: roleForEligibility })) {
        throw attachmentError(ATTACHMENT_ERRORS.INVALID_DIRECTOR_ROLE, 400, 'INVALID_DIRECTOR_ROLE');
    }
    return { user, direction };
}

async function clearDirectorSeat(prisma, userId) {
    await prisma.direction.updateMany({
        where: { directorId: userId },
        data: { directorId: null },
    });
}

/**
 * Après création / modification utilisateur : aligne Direction.directorId
 * et refuse les combinaisons interdites.
 */
async function applyDirectionRoleSideEffects(prisma, {
    userId,
    previousRole,
    previousDirectionId,
    nextRole,
    nextDirectionId,
    replaceExisting = false,
}) {
    const nextExclusive = isDirectionExclusiveRole(nextRole);

    // Assistant : direction obligatoire. DG : peut rester sans direction (pool d'affectation).
    if (nextRole === ROLES.ASSISTANT && !nextDirectionId) {
        throw attachmentError(
            'Un utilisateur ASSISTANT doit être rattaché à une direction.',
            400,
            'DIRECTION_REQUIRED',
        );
    }

    if (nextExclusive && nextDirectionId) {
        await assertCanAttach(prisma, userId, nextDirectionId, nextRole, {
            replaceExisting,
            pendingRole: nextRole,
            ignoreCurrentDirection: previousDirectionId !== nextDirectionId,
        });
    }

    if (previousRole === ROLES.DG && (nextRole !== ROLES.DG || previousDirectionId !== nextDirectionId)) {
        await clearDirectorSeat(prisma, userId);
    }

    // Promu DG sans direction : libérer tout siège DG éventuel, sans rattachement.
    if (nextRole === ROLES.DG && !nextDirectionId) {
        await clearDirectorSeat(prisma, userId);
    }

    if (nextRole === ROLES.DG && nextDirectionId) {
        const direction = await loadDirection(prisma, nextDirectionId);
        if (direction.directorId && direction.directorId !== userId && !replaceExisting) {
            throw attachmentError(ATTACHMENT_ERRORS.DIRECTION_HAS_DG, 409, 'DIRECTION_HAS_DG');
        }
        if (direction.directorId && direction.directorId !== userId && replaceExisting) {
            const previous = direction.director;
            // Ancien DG : garde le rôle, sans direction → redisponible.
            if (previous?.role === ROLES.DG) {
                await prisma.user.update({
                    where: { id: direction.directorId },
                    data: { directionId: null },
                });
            }
        }
        await prisma.direction.update({
            where: { id: nextDirectionId },
            data: { directorId: userId },
        });
    }

    return { ok: true };
}

async function assignDirector(prisma, directionId, userId, { actorId, replaceExisting = false } = {}) {
    const { user, direction } = await assertCanAttach(prisma, userId, directionId, ROLES.DG, {
        replaceExisting,
        pendingRole: ROLES.DG,
    });

    await prisma.$transaction(async (tx) => {
        if (user.role === ROLES.DG || user.directedDirection) {
            await tx.direction.updateMany({
                where: { directorId: userId },
                data: { directorId: null },
            });
        }
        if (direction.directorId && direction.directorId !== userId) {
            if (!replaceExisting) {
                throw attachmentError(ATTACHMENT_ERRORS.DIRECTION_HAS_DG, 409, 'DIRECTION_HAS_DG');
            }
            // L'ancien DG garde le rôle DG, sans direction → redisponible pour une autre affectation.
            if (direction.director?.role === ROLES.DG) {
                await tx.user.update({
                    where: { id: direction.directorId },
                    data: { directionId: null },
                });
            }
        }
        await tx.user.update({
            where: { id: userId },
            data: { role: directorRoleToKeep(user), directionId },
        });
        await tx.direction.update({
            where: { id: directionId },
            data: { directorId: userId },
        });
    });

    return {
        action: direction.directorId && direction.directorId !== userId ? 'DG_CHANGED' : 'DG_ASSIGNED',
        actorId,
        directionId,
        userId,
        previousDirectorId: direction.directorId || null,
    };
}

async function removeDirector(prisma, directionId, { actorId } = {}) {
    const direction = await loadDirection(prisma, directionId);
    if (!direction) throw attachmentError('Direction introuvable.', 404, 'DIRECTION_NOT_FOUND');
    if (!direction.directorId) return { action: 'DG_REMOVED', actorId, directionId, userId: null };

    const ops = [
        prisma.direction.update({
            where: { id: directionId },
            data: { directorId: null },
        }),
    ];
    // Conserve le rôle DG sans direction (pool d'affectation).
    if (direction.director?.role === ROLES.DG) {
        ops.push(prisma.user.update({
            where: { id: direction.directorId },
            data: { directionId: null },
        }));
    }
    await prisma.$transaction(ops);

    return {
        action: 'DG_REMOVED',
        actorId,
        directionId,
        userId: direction.directorId,
    };
}

async function assignAssistant(prisma, directionId, userId, { actorId, replaceExisting = false } = {}) {
    const { user } = await assertCanAttach(prisma, userId, directionId, ROLES.ASSISTANT, {
        replaceExisting,
        pendingRole: ROLES.ASSISTANT,
    });

    if (user.role === ROLES.SUPER_ADMIN) {
        throw attachmentError(
            'Un super administrateur ne peut pas être promu Assistant. Changez d\'abord son rôle.',
            400,
            'INVALID_ASSISTANT_ROLE',
        );
    }

    const previousRole = user.role;
    await prisma.$transaction(async (tx) => {
        await tx.direction.updateMany({
            where: { directorId: userId },
            data: { directorId: null },
        });
        await tx.user.update({
            where: { id: userId },
            data: { role: ROLES.ASSISTANT, directionId },
        });
    });

    return {
        action: previousRole === ROLES.ASSISTANT ? 'ASSISTANT_ASSIGNED' : 'ASSISTANT_PROMOTED',
        actorId,
        directionId,
        userId,
        previousRole,
    };
}

async function removeAssistant(prisma, directionId, userId, { actorId } = {}) {
    const user = await loadUser(prisma, userId);
    if (!user) throw attachmentError('Utilisateur introuvable.', 404, 'USER_NOT_FOUND');
    if (user.directionId !== directionId || user.role !== ROLES.ASSISTANT) {
        throw attachmentError('Cet utilisateur n\'est pas Assistant de cette direction.', 400, 'NOT_ASSISTANT');
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role: ROLES.RESPONSABLE },
    });

    return {
        action: 'ASSISTANT_REMOVED',
        actorId,
        directionId,
        userId,
    };
}

async function listDirectionStaff(prisma, directionId) {
    const direction = await prisma.direction.findUnique({
        where: { id: directionId },
        include: {
            director: { select: USER_SELECT },
            users: {
                where: { isDeleted: false },
                select: USER_SELECT,
                orderBy: { name: 'asc' },
            },
        },
    });
    if (!direction) return null;
    const assistants = direction.users.filter((u) => u.role === ROLES.ASSISTANT);
    return {
        ...direction,
        assistants,
        users: direction.users,
    };
}

module.exports = {
    getDirectorForDirection,
    assertCanAttach,
    applyDirectionRoleSideEffects,
    assignDirector,
    removeDirector,
    assignAssistant,
    removeAssistant,
    listDirectionStaff,
    clearDirectorSeat,
    attachmentError,
    normalizeStoredRole,
};
