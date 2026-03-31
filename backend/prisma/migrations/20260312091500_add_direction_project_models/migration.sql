-- CreateTable
CREATE TABLE "Direction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "directionId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "projectId" TEXT;

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN "directionId" TEXT;
ALTER TABLE "Mission" ADD COLUMN "projectId" TEXT;

-- AlterTable
ALTER TABLE "PlanningEvent" ADD COLUMN "directionId" TEXT;
ALTER TABLE "PlanningEvent" ADD COLUMN "projectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Direction_name_key" ON "Direction"("name");
CREATE UNIQUE INDEX "Direction_code_key" ON "Direction"("code");
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Meeting_directionId_idx" ON "Meeting"("directionId");
CREATE INDEX "Meeting_projectId_idx" ON "Meeting"("projectId");
CREATE INDEX "Mission_directionId_idx" ON "Mission"("directionId");
CREATE INDEX "Mission_projectId_idx" ON "Mission"("projectId");
CREATE INDEX "PlanningEvent_directionId_idx" ON "PlanningEvent"("directionId");
CREATE INDEX "PlanningEvent_projectId_idx" ON "PlanningEvent"("projectId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlanningEvent" ADD CONSTRAINT "PlanningEvent_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlanningEvent" ADD CONSTRAINT "PlanningEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
