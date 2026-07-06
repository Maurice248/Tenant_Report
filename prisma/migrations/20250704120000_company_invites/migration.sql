-- CreateTable
CREATE TABLE IF NOT EXISTS "company_invites" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "company_invites_tokenHash_key" ON "company_invites"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_invites_companyId_idx" ON "company_invites"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_invites_email_idx" ON "company_invites"("email");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "company_invites" ADD CONSTRAINT "company_invites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
