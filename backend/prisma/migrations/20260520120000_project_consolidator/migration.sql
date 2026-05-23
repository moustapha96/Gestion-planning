-- AlterTable
ALTER TABLE "Project" ADD COLUMN "consolidatorId" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_consolidatorId_fkey" FOREIGN KEY ("consolidatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Project_consolidatorId_idx" ON "Project"("consolidatorId");
