import { prisma } from '@/lib/prisma';
import {
  type IntegrationCredentials,
  rowToCredentials,
} from '@/lib/company-integrations';
import { getModuleStatuses, isAnyModuleConfigured, type ModuleStatus } from '@/lib/company-module-status';

export async function companyHasIntegrationsConfigured(companyId: string): Promise<boolean> {
  const row = await prisma.companyIntegration.findUnique({ where: { companyId } });
  const creds = rowToCredentials(row);
  return isAnyModuleConfigured(creds);
}

export async function getCompanyIntegrationStatus(companyId: string) {
  const row = await prisma.companyIntegration.findUnique({ where: { companyId } });
  const creds = rowToCredentials(row);
  const modules = getModuleStatuses(creds);
  return {
    configured: isAnyModuleConfigured(creds),
    modules,
    credentials: creds,
  };
}

export type { ModuleStatus };
