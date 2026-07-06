import { Prisma } from '@prisma/client';

export function executionWhere(
  companyId: string | null,
  userId: string
): Prisma.WorkflowExecutionWhereInput {
  if (companyId) return { companyId };
  return { userId };
}

export function executionRelationWhere(
  companyId: string | null,
  userId: string
): Prisma.WorkflowExecutionWhereInput {
  return executionWhere(companyId, userId);
}
