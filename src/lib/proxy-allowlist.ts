import { N8N_WEBHOOK_FIELDS } from '@/lib/n8n-config';
import { getRequestCompanyId } from '@/lib/auth';
import { getCompanyIntegrations } from '@/lib/company-integrations';

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isBlockedHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname === '127.0.0.1' || hostname.startsWith('127.')) return true;
  if (hostname === '::1' || hostname === '[::1]') return true;
  if (hostname.startsWith('10.')) return true;
  if (hostname.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (hostname.startsWith('169.254.')) return true;
  if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return true;
  return false;
}

function collectEnvHostnames(): Set<string> {
  const hosts = new Set<string>();

  const addUrl = (url: string | undefined | null) => {
    if (!url?.trim()) return;
    const host = hostnameFromUrl(url.trim());
    if (host) hosts.add(host);
  };

  addUrl(process.env.N8N_API_BASE_URL);

  for (const field of N8N_WEBHOOK_FIELDS) {
    addUrl(process.env[field.key]);
  }

  return hosts;
}

/** Returns true when the URL targets an allowed n8n host (env + tenant webhooks). */
export async function isAllowedProxyUrl(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHostname(hostname)) {
    return false;
  }

  const allowed = collectEnvHostnames();

  const companyId = await getRequestCompanyId();
  if (companyId) {
    const creds = await getCompanyIntegrations(companyId);
    addIntegrationHosts(allowed, creds.n8nApiBaseUrl, creds.n8nWebhooks);
  }

  return allowed.has(hostname);
}

function addIntegrationHosts(
  hosts: Set<string>,
  apiBaseUrl: string | null | undefined,
  webhooks: Record<string, string>
) {
  const addUrl = (url: string | undefined | null) => {
    if (!url?.trim()) return;
    const host = hostnameFromUrl(url.trim());
    if (host) hosts.add(host);
  };

  addUrl(apiBaseUrl);
  for (const webhookUrl of Object.values(webhooks)) {
    addUrl(webhookUrl);
  }
}
