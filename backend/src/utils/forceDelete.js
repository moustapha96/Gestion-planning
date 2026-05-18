/**
 * Détache les références FK avant suppression forcée (super admin).
 */
async function detachProjectReferences(prisma, projectId) {
    await prisma.mission.updateMany({ where: { projectId }, data: { projectId: null } });
    await prisma.meeting.updateMany({ where: { projectId }, data: { projectId: null } });
    await prisma.planningEvent.updateMany({ where: { projectId }, data: { projectId: null } });
    await prisma.user.updateMany({ where: { projectId }, data: { projectId: null } });
}

async function detachDirectionReferences(prisma, directionId) {
    await prisma.mission.updateMany({ where: { directionId }, data: { directionId: null } });
    await prisma.meeting.updateMany({ where: { directionId }, data: { directionId: null } });
    await prisma.planningEvent.updateMany({ where: { directionId }, data: { directionId: null } });
    await prisma.user.updateMany({ where: { directionId }, data: { directionId: null } });
}

module.exports = {
    detachProjectReferences,
    detachDirectionReferences,
};
