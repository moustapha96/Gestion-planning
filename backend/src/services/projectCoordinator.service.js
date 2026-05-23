const { ROLES, isPrivilegedAdmin } = require('../config/roles');
const {
    userMayCoordinateProject,
    userMayActAsServiceDirector,
} = require('./roleConfig.service');

const COORDINATOR_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    isDeleted: true,
};

const PROJECT_COORDINATOR_INCLUDE = {
    coordinator: { select: COORDINATOR_USER_SELECT },
};

async function getProjectCoordinator(prisma, projectId) {
    if (!projectId) return null;
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            name: true,
            coordinatorId: true,
            coordinator: { select: COORDINATOR_USER_SELECT },
        },
    });
    const c = project?.coordinator;
    if (!c || !c.isActive || c.isDeleted) return null;
    return c;
}

function isUserProjectCoordinator(user, projectOrCoordinatorId) {
    if (!user?.id) return false;
    const coordinatorId = typeof projectOrCoordinatorId === 'string'
        ? projectOrCoordinatorId
        : projectOrCoordinatorId?.coordinatorId;
    return Boolean(coordinatorId && coordinatorId === user.id);
}

function canActAsCoordinator(user, projectOrCoordinatorId) {
    if (!user) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (userMayCoordinateProject(user) || userMayActAsServiceDirector(user)) return true;
    return isUserProjectCoordinator(user, projectOrCoordinatorId);
}

async function canUserCoordinatePlanning(prisma, user, planning) {
    if (!user || !planning) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (userMayCoordinateProject(user) || userMayActAsServiceDirector(user)) return true;
    const owner = planning.user || await prisma.user.findUnique({
        where: { id: planning.userId },
        select: { projectId: true },
    });
    if (!owner?.projectId) return false;
    const project = await prisma.project.findUnique({
        where: { id: owner.projectId },
        select: { coordinatorId: true },
    });
    return isUserProjectCoordinator(user, project);
}

async function canUserReturnPlanning(prisma, user, planning) {
    if (!user || !planning) return false;
    if (isPrivilegedAdmin(user.role)) return true;
    if (userMayActAsServiceDirector(user)) return true;
    return canUserCoordinatePlanning(prisma, user, planning);
}

async function validateCoordinatorId(prisma, coordinatorIdRaw) {
    if (coordinatorIdRaw === null || coordinatorIdRaw === undefined || coordinatorIdRaw === '') {
        return { ok: true, value: null };
    }
    const id = String(coordinatorIdRaw).trim();
    const user = await prisma.user.findFirst({
        where: { id, isDeleted: false, isActive: true },
        select: { id: true },
    });
    if (!user) return { ok: false, error: 'Coordinateur introuvable ou inactif.' };
    return { ok: true, value: id };
}

async function notifyProjectCoordinatorAssigned(prisma, projectId, userId, options = {}) {
    if (!projectId || !userId) return;
    const { notificationService } = require('./notification.service');
    const [user, project] = await Promise.all([
        prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            select: COORDINATOR_USER_SELECT,
        }),
        prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true, code: true },
        }),
    ]);
    if (!user?.email || !project) return;

    const assignedByName = options.assignedByName || 'L\'administration';
    const link = `/projects/${project.id}`;
    const title = `Coordinateur du projet « ${project.name} »`;
    const message = `${assignedByName} vous a désigné coordinateur du projet ${project.name}.`;

    await notificationService.createNotification(
        prisma,
        user.id,
        'PROJECT_COORDINATOR_ASSIGNED',
        title,
        message,
        link,
    );
    try {
        await notificationService.sendEmail(
            user.email,
            'PROJECT_COORDINATOR_ASSIGNED',
            [user, project, assignedByName, link],
        );
    } catch {
        // email optionnel
    }
}

module.exports = {
    COORDINATOR_USER_SELECT,
    PROJECT_COORDINATOR_INCLUDE,
    getProjectCoordinator,
    isUserProjectCoordinator,
    canActAsCoordinator,
    canUserCoordinatePlanning,
    canUserReturnPlanning,
    validateCoordinatorId,
    notifyProjectCoordinatorAssigned,
};
