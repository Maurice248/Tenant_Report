import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/integration-crypto';

export const API_TOKEN_SECRET_DEFINITIONS = [
  { key: 'apify', label: 'Apify', placeholder: 'apify_api_…' },
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
  { key: 'assemblyai', label: 'AssemblyAI', placeholder: '…' },
  { key: 'kie', label: 'KIE', placeholder: '…' },
  { key: 'uploadPost', label: 'Upload Post', placeholder: '…' },
  { key: 'googleGemini', label: 'Google Gemini', placeholder: 'AIza…' },
  { key: 'googleEmail', label: 'Google Email', placeholder: 'OAuth token or app password' },
  { key: 'resend', label: 'Resend', placeholder: 're_…' },
  { key: 'millionVerifier', label: 'Million Verifier', placeholder: '…' },
  { key: 'instantlyAi', label: 'Instantly.ai', placeholder: '…' },
  { key: 'dataforseo', label: 'DataForSEO', placeholder: 'login:password or API token' },
] as const;

export type ApiTokenSecretKey = (typeof API_TOKEN_SECRET_DEFINITIONS)[number]['key'];

export type ApiTokenSecretsMap = Record<ApiTokenSecretKey, string>;

export type ApiTokenSecretView = {
  key: ApiTokenSecretKey;
  label: string;
  placeholder: string;
  set: boolean;
  masked: string;
};

const EMPTY_SECRETS = Object.fromEntries(
  API_TOKEN_SECRET_DEFINITIONS.map((d) => [d.key, ''])
) as ApiTokenSecretsMap;

function parseSecretsEnc(value: string | null | undefined): ApiTokenSecretsMap {
  if (!value) return { ...EMPTY_SECRETS };
  try {
    const parsed = JSON.parse(decryptSecret(value)) as Partial<ApiTokenSecretsMap>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...EMPTY_SECRETS };
    return {
      ...EMPTY_SECRETS,
      ...Object.fromEntries(
        API_TOKEN_SECRET_DEFINITIONS.map((d) => [d.key, parsed[d.key]?.trim() || ''])
      ),
    } as ApiTokenSecretsMap;
  } catch {
    return { ...EMPTY_SECRETS };
  }
}

export function toApiTokenSecretsView(secrets: ApiTokenSecretsMap): ApiTokenSecretView[] {
  return API_TOKEN_SECRET_DEFINITIONS.map((def) => {
    const secret = secrets[def.key] || '';
    return {
      key: def.key,
      label: def.label,
      placeholder: def.placeholder,
      set: Boolean(secret),
      masked: secret ? maskSecret(secret) : '',
    };
  });
}

export async function getCompanyApiTokenSecrets(companyId: string): Promise<ApiTokenSecretsMap> {
  const rows = await prisma.$queryRaw<Array<{ apiTokenSecretsEnc: string | null }>>`
    SELECT "apiTokenSecretsEnc" FROM company_integrations WHERE "companyId" = ${companyId} LIMIT 1
  `;
  return parseSecretsEnc(rows[0]?.apiTokenSecretsEnc ?? null);
}

export async function upsertCompanyApiTokenSecrets(
  companyId: string,
  input: Partial<Record<ApiTokenSecretKey, string>>
): Promise<ApiTokenSecretView[]> {
  const existing = await getCompanyApiTokenSecrets(companyId);
  const merged = { ...existing };

  for (const def of API_TOKEN_SECRET_DEFINITIONS) {
    const value = input[def.key]?.trim();
    if (value) merged[def.key] = value;
  }

  const payload = encryptSecret(JSON.stringify(merged));

  await prisma.companyIntegration.upsert({
    where: { companyId },
    create: { companyId },
    update: {},
  });

  await prisma.$executeRaw`
    UPDATE company_integrations
    SET "apiTokenSecretsEnc" = ${payload}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "companyId" = ${companyId}
  `;

  return toApiTokenSecretsView(merged);
}
