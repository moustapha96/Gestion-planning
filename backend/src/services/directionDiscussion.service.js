async function ensureDirectionDiscussion(prisma, directionId) {
    if (!directionId) return null;
    return prisma.directionDiscussion.upsert({
        where: { directionId },
        update: {},
        create: { directionId },
    });
}

async function syncDirectionDiscussionMembers(prisma, directionId) {
    if (!directionId) return null;
    const members = await prisma.user.findMany({
        where: { directionId, isDeleted: false },
        select: { id: true },
    });
    if (members.length === 0) return null;
    const discussion = await ensureDirectionDiscussion(prisma, directionId);
    const userIds = members.map((m) => m.id);
    await prisma.directionDiscussionMember.deleteMany({
        where: {
            discussionId: discussion.id,
            userId: { notIn: userIds },
        },
    });
    if (userIds.length > 0) {
        await prisma.directionDiscussionMember.createMany({
            data: userIds.map((userId) => ({ discussionId: discussion.id, userId })),
            skipDuplicates: true,
        });
    }
    return discussion;
}

module.exports = {
    ensureDirectionDiscussion,
    syncDirectionDiscussionMembers,
};

