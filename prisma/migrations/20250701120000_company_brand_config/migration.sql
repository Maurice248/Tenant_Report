-- CreateTable
CREATE TABLE "company_brand_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "products_services" TEXT NOT NULL DEFAULT '',
    "value_proposition" TEXT NOT NULL DEFAULT '',
    "brand_voice" TEXT NOT NULL DEFAULT '',
    "positioning" TEXT NOT NULL DEFAULT '',
    "competitors" TEXT NOT NULL DEFAULT '',
    "pain_points" TEXT NOT NULL DEFAULT '',
    "icp_meta_ads" TEXT NOT NULL DEFAULT '',
    "icp_newsletter" TEXT NOT NULL DEFAULT '',
    "icp_outreach" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_brand_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_brand_snapshots" (
    "id" TEXT NOT NULL,
    "brand_config_id" TEXT NOT NULL,
    "products_services" TEXT NOT NULL DEFAULT '',
    "value_proposition" TEXT NOT NULL DEFAULT '',
    "brand_voice" TEXT NOT NULL DEFAULT '',
    "positioning" TEXT NOT NULL DEFAULT '',
    "competitors" TEXT NOT NULL DEFAULT '',
    "pain_points" TEXT NOT NULL DEFAULT '',
    "icp_meta_ads" TEXT NOT NULL DEFAULT '',
    "icp_newsletter" TEXT NOT NULL DEFAULT '',
    "icp_outreach" TEXT NOT NULL DEFAULT '',
    "content_hash" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_brand_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_brand_configs_companyId_key" ON "company_brand_configs"("companyId");

-- CreateIndex
CREATE INDEX "company_brand_snapshots_brand_config_id_idx" ON "company_brand_snapshots"("brand_config_id");

-- AddForeignKey
ALTER TABLE "company_brand_configs" ADD CONSTRAINT "company_brand_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_brand_snapshots" ADD CONSTRAINT "company_brand_snapshots_brand_config_id_fkey" FOREIGN KEY ("brand_config_id") REFERENCES "company_brand_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
