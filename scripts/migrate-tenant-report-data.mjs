import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const LEGACY_BRAND_CONFIG_ID = 'd33fb700-9a07-4478-9ff1-6f636f2f3625';
const PLATFORM_SLUG = process.env.PLATFORM_COMPANY_SLUG || 'tenant-report';

async function main() {
  const company = await prisma.company.findUnique({ where: { slug: PLATFORM_SLUG } });
  if (!company) {
    console.error('Tenant Report company not found. Run: npx prisma db seed');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('Supabase env missing — skipping legacy brand config import');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: legacyConfig, error: configError } = await supabase
    .from('brand_configs')
    .select('*')
    .eq('id', LEGACY_BRAND_CONFIG_ID)
    .maybeSingle();

  if (configError) {
    throw new Error(configError.message);
  }

  const brandConfig = await prisma.companyBrandConfig.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      productsServices: legacyConfig?.products_services ?? '',
      valueProposition: legacyConfig?.value_proposition ?? '',
      brandVoice: legacyConfig?.brand_voice ?? '',
      positioning: legacyConfig?.positioning ?? '',
      competitors: legacyConfig?.competitors ?? '',
      painPoints: legacyConfig?.pain_points ?? '',
      icpMetaAds: legacyConfig?.icp_meta_ads ?? '',
      icpNewsletter: legacyConfig?.icp_newsletter ?? '',
      icpOutreach: legacyConfig?.icp_outreach ?? '',
    },
    update: {
      productsServices: legacyConfig?.products_services ?? '',
      valueProposition: legacyConfig?.value_proposition ?? '',
      brandVoice: legacyConfig?.brand_voice ?? '',
      positioning: legacyConfig?.positioning ?? '',
      competitors: legacyConfig?.competitors ?? '',
      painPoints: legacyConfig?.pain_points ?? '',
      icpMetaAds: legacyConfig?.icp_meta_ads ?? '',
      icpNewsletter: legacyConfig?.icp_newsletter ?? '',
      icpOutreach: legacyConfig?.icp_outreach ?? '',
    },
  });

  console.log('Brand config migrated for', company.name);

  const { data: legacySnapshots, error: snapshotsError } = await supabase
    .from('brand_config_snapshots')
    .select('*')
    .eq('brand_config_id', LEGACY_BRAND_CONFIG_ID)
    .order('created_at', { ascending: false });

  if (snapshotsError) {
    throw new Error(snapshotsError.message);
  }

  const existingHashes = new Set(
    (
      await prisma.companyBrandSnapshot.findMany({
        where: { brandConfigId: brandConfig.id },
        select: { contentHash: true },
      })
    ).map((s) => s.contentHash)
  );

  let imported = 0;
  for (const snap of legacySnapshots ?? []) {
    const fields = {
      products_services: snap.products_services ?? '',
      value_proposition: snap.value_proposition ?? '',
      brand_voice: snap.brand_voice ?? '',
      positioning: snap.positioning ?? '',
      competitors: snap.competitors ?? '',
      pain_points: snap.pain_points ?? '',
      icp_meta_ads: snap.icp_meta_ads ?? '',
      icp_newsletter: snap.icp_newsletter ?? '',
      icp_outreach: snap.icp_outreach ?? '',
    };
    const contentHash = snap.content_hash || `${snap.id}-legacy`;
    if (existingHashes.has(contentHash)) continue;

    await prisma.companyBrandSnapshot.create({
      data: {
        brandConfigId: brandConfig.id,
        productsServices: fields.products_services,
        valueProposition: fields.value_proposition,
        brandVoice: fields.brand_voice,
        positioning: fields.positioning,
        competitors: fields.competitors,
        painPoints: fields.pain_points,
        icpMetaAds: fields.icp_meta_ads,
        icpNewsletter: fields.icp_newsletter,
        icpOutreach: fields.icp_outreach,
        contentHash,
        label: snap.label,
        createdAt: snap.created_at ? new Date(snap.created_at) : undefined,
      },
    });
    existingHashes.add(contentHash);
    imported += 1;
  }

  console.log(`Imported ${imported} brand snapshot(s) for`, company.name);

  for (const other of await prisma.company.findMany({ where: { NOT: { id: company.id } } })) {
    await prisma.companyBrandConfig.upsert({
      where: { companyId: other.id },
      create: { companyId: other.id },
      update: {},
    });
    console.log('Ensured empty brand config for', other.name);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
