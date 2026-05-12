-- Chaîne de validation planning : IN_CONSOLIDATION → CP_PENDING (coordinateur → SG → DG)
UPDATE "Planning" SET status = 'CP_PENDING' WHERE status = 'IN_CONSOLIDATION';
