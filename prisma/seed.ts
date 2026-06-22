import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@tenantreport.ai').toLowerCase();
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'pass@123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Tenant Report Admin';

async function seedPrismaAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: passwordHash,
      role: 'ADMIN',
      name: ADMIN_NAME,
    },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('[Prisma] Admin user ready in Supabase PostgreSQL (users table):', admin.email, `(id: ${admin.id})`);
  return admin;
}

async function seedSupabaseAuthAdmin() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Supabase Auth] Skipped — missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error(`[Supabase Auth] listUsers failed: ${listError.message}`);
  }

  const existing = listData.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'ADMIN', name: ADMIN_NAME },
    });
    if (error) throw new Error(`[Supabase Auth] updateUser failed: ${error.message}`);
    console.log('[Supabase Auth] Admin user updated:', ADMIN_EMAIL, `(id: ${existing.id})`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'ADMIN', name: ADMIN_NAME },
  });
  if (error) throw new Error(`[Supabase Auth] createUser failed: ${error.message}`);
  console.log('[Supabase Auth] Admin user created:', ADMIN_EMAIL, `(id: ${data.user?.id})`);
}

async function main() {
  await seedPrismaAdmin();
  await seedSupabaseAuthAdmin();
  console.log('\nLogin credentials:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
