-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1565C0',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventType_code_key" ON "EventType"("code");

-- CreateIndex
CREATE INDEX "EventType_isActive_sortOrder_idx" ON "EventType"("isActive", "sortOrder");

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "eventTypeId" TEXT;

-- AlterTable
ALTER TABLE "PlanningEvent" ADD COLUMN "eventTypeId" TEXT;

-- CreateIndex
CREATE INDEX "Meeting_eventTypeId_idx" ON "Meeting"("eventTypeId");

-- CreateIndex
CREATE INDEX "PlanningEvent_eventTypeId_idx" ON "PlanningEvent"("eventTypeId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningEvent" ADD CONSTRAINT "PlanningEvent_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default types (IDs stables pour référence éventuelle)
INSERT INTO "EventType" ("id", "name", "code", "color", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('cm_evt_seed_reunion', 'Réunion', 'REUNION', '#1565C0', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm_evt_seed_mission', 'Mission', 'MISSION', '#722ed1', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm_evt_seed_deplacement', 'Déplacement', 'DEPLACEMENT', '#fa8c16', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm_evt_seed_formation', 'Formation', 'FORMATION', '#52c41a', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm_evt_seed_autre', 'Autre', 'AUTRE', '#595959', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rattacher les événements planning existants par code (type texte)
UPDATE "PlanningEvent" pe
SET "eventTypeId" = et.id
FROM "EventType" et
WHERE UPPER(TRIM(pe.type)) = et.code;
