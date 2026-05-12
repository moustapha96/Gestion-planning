-- Téléphone, poste, cellule (complètent direction / projet sur le profil utilisateur)
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "User" ADD COLUMN "cellUnit" TEXT;
