-- AlterTable: ajouter logoUrl au modèle Project (valeur par défaut /logo-gp.png)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT NOT NULL DEFAULT '/logo-gp.png';
