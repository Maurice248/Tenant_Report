-- Outreach / dashboard tables only — does NOT drop existing Supabase tables

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workflow_executions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "workflowName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "n8nExecutionId" TEXT,
    "inputData" TEXT NOT NULL,
    "outputData" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "targetRegion" TEXT NOT NULL,
    "campaignGoal" TEXT NOT NULL DEFAULT '',
    "campaignMessage" TEXT NOT NULL DEFAULT '',
    "selectedSheet" TEXT NOT NULL,
    "totalLeadsSent" INTEGER NOT NULL DEFAULT 0,
    "successfulSends" INTEGER NOT NULL DEFAULT 0,
    "failedSends" INTEGER NOT NULL DEFAULT 0,
    "aiGeneratedContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "comments" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "scraper_jobs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "niches" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "maxResults" INTEGER NOT NULL,
    "totalScraped" INTEGER NOT NULL DEFAULT 0,
    "validEmails" INTEGER NOT NULL DEFAULT 0,
    "invalidEmails" INTEGER NOT NULL DEFAULT 0,
    "targetSheet" TEXT NOT NULL,
    "apifyRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scraper_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cleanup_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "totalContacts" INTEGER NOT NULL,
    "deletedCount" INTEGER NOT NULL,
    "triggerType" TEXT NOT NULL,
    "cleanupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cleanup_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "workflow_executions_userId_idx" ON "workflow_executions"("userId");
CREATE INDEX IF NOT EXISTS "workflow_executions_workflowType_idx" ON "workflow_executions"("workflowType");
CREATE INDEX IF NOT EXISTS "workflow_executions_status_idx" ON "workflow_executions"("status");
CREATE INDEX IF NOT EXISTS "workflow_executions_createdAt_idx" ON "workflow_executions"("createdAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_executionId_key" ON "campaigns"("executionId");
CREATE INDEX IF NOT EXISTS "campaigns_campaignName_idx" ON "campaigns"("campaignName");
CREATE INDEX IF NOT EXISTS "campaigns_serviceType_idx" ON "campaigns"("serviceType");
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX IF NOT EXISTS "campaigns_createdAt_idx" ON "campaigns"("createdAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "scraper_jobs_executionId_key" ON "scraper_jobs"("executionId");
CREATE INDEX IF NOT EXISTS "scraper_jobs_location_idx" ON "scraper_jobs"("location");
CREATE INDEX IF NOT EXISTS "scraper_jobs_createdAt_idx" ON "scraper_jobs"("createdAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "cleanup_logs_executionId_key" ON "cleanup_logs"("executionId");
CREATE INDEX IF NOT EXISTS "cleanup_logs_cleanupDate_idx" ON "cleanup_logs"("cleanupDate" DESC);

DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "scraper_jobs" ADD CONSTRAINT "scraper_jobs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cleanup_logs" ADD CONSTRAINT "cleanup_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
