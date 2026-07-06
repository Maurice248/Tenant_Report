ALTER TABLE "workflow_executions" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

UPDATE "workflow_executions" we
SET "companyId" = u."companyId"
FROM "users" u
WHERE we."userId" = u.id
  AND u."companyId" IS NOT NULL
  AND we."companyId" IS NULL;

CREATE INDEX IF NOT EXISTS "workflow_executions_companyId_idx" ON "workflow_executions"("companyId");

ALTER TABLE "workflow_executions"
  ADD CONSTRAINT "workflow_executions_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
