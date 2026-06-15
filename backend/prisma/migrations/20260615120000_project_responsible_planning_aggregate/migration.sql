-- Responsable de projet (utilisateur au rôle RESPONSABLE)
ALTER TABLE "Project" ADD COLUMN "responsibleId" TEXT;

CREATE INDEX "Project_responsibleId_idx" ON "Project"("responsibleId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_responsibleId_fkey"
  FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rétro-attribution : membre RESPONSABLE rattaché au projet
UPDATE "Project" p
SET "responsibleId" = u.id
FROM "User" u
WHERE u."projectId" = p.id
  AND u.role = 'RESPONSABLE'
  AND u."isDeleted" = false
  AND p."responsibleId" IS NULL;

-- Plannings existants : publication directe (plus de circuit de validation planning)
UPDATE "Planning"
SET status = 'VALIDATED',
    "validatedAt" = COALESCE("validatedAt", NOW())
WHERE status NOT IN ('VALIDATED', 'CANCELLED');
