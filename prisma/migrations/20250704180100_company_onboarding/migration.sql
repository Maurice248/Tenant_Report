ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

UPDATE "companies"
SET "onboardingCompletedAt" = CURRENT_TIMESTAMP
WHERE "onboardingCompletedAt" IS NULL;
