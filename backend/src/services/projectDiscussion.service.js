async function ensureProjectDiscussion(prisma, projectId) {
    if (!projectId) return null;
    return prisma.projectDiscussion.upsert({
        where: { projectId },
        update: {},
        create: { projectId },
    });
}

async function syncProjectDiscussionMembers(prisma, projectId) {
    if (!projectId) return null;
    const members = await prisma.user.findMany({
        where: { projectId, isDeleted: false },
        select: { id: true },
    });
    if (members.length === 0) return null;
    const discussion = await ensureProjectDiscussion(prisma, projectId);
    const userIds = members.map((m) => m.id);
    await prisma.projectDiscussionMember.deleteMany({
        where: {
            discussionId: discussion.id,
            userId: { notIn: userIds },
        },
    });
    if (userIds.length > 0) {
        await prisma.projectDiscussionMember.createMany({
            data: userIds.map((userId) => ({ discussionId: discussion.id, userId })),
            skipDuplicates: true,
        });
    }
    return discussion;
}

module.exports = {
    ensureProjectDiscussion,
    syncProjectDiscussionMembers,
};
