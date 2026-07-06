import {
  getRequestCompanyIntegrations,
  getWordPressConfigFromIntegrations,
  isWordPressConfiguredFromIntegrations,
} from '@/lib/company-integrations';

export async function resolveWordPressConfigForRequest() {
  const creds = await getRequestCompanyIntegrations();
  return getWordPressConfigFromIntegrations(creds);
}

export async function isWordPressConfiguredForRequest() {
  const creds = await getRequestCompanyIntegrations();
  return isWordPressConfiguredFromIntegrations(creds);
}

export const WORDPRESS_NOT_CONFIGURED_MSG =
  'WordPress is not configured. Add credentials in Client Dashboard → API keys.';
