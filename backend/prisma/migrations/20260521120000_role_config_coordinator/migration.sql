-- Coordinateur de projet + règles rôle/direction
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "coordinatorId" TEXT;

CREATE INDEX IF NOT EXISTS "Project_coordinatorId_idx" ON "Project"("coordinatorId");

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_coordinatorId_fkey"
    FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "RoleDirectionRule" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDirectionRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoleDirectionRule_role_directionId_key" ON "RoleDirectionRule"("role", "directionId");
CREATE INDEX IF NOT EXISTS "RoleDirectionRule_role_idx" ON "RoleDirectionRule"("role");
CREATE INDEX IF NOT EXISTS "RoleDirectionRule_directionId_idx" ON "RoleDirectionRule"("directionId");

DO $$ BEGIN
  ALTER TABLE "RoleDirectionRule" ADD CONSTRAINT "RoleDirectionRule_directionId_fkey"
    FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Anciens rôles → nouveaux rôles système
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" IN ('DG', 'SECRETAIRE_GENERAL');
UPDATE "User" SET "role" = 'CONSOLIDATEUR' WHERE "role" = 'COORDINATEUR_PROJET';
