-- Messagerie d'équipe par projet (miroir des discussions de direction)

CREATE TABLE "ProjectDiscussion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDiscussion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectDiscussion_projectId_key" ON "ProjectDiscussion"("projectId");

CREATE TABLE "ProjectDiscussionMember" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDiscussionMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectDiscussionMember_discussionId_userId_key" ON "ProjectDiscussionMember"("discussionId", "userId");
CREATE INDEX "ProjectDiscussionMember_userId_joinedAt_idx" ON "ProjectDiscussionMember"("userId", "joinedAt");

CREATE TABLE "ProjectMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectMessage_projectId_createdAt_idx" ON "ProjectMessage"("projectId", "createdAt");
CREATE INDEX "ProjectMessage_senderId_createdAt_idx" ON "ProjectMessage"("senderId", "createdAt");
CREATE INDEX "ProjectMessage_parentId_idx" ON "ProjectMessage"("parentId");

ALTER TABLE "User" ADD COLUMN "projectId" TEXT;
CREATE INDEX "User_projectId_idx" ON "User"("projectId");

ALTER TABLE "ProjectDiscussion" ADD CONSTRAINT "ProjectDiscussion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDiscussionMember" ADD CONSTRAINT "ProjectDiscussionMember_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "ProjectDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDiscussionMember" ADD CONSTRAINT "ProjectDiscussionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
