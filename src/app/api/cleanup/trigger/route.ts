export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId, getRequestCompanyId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { n8nClient } from '@/lib/n8n';

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = await getRequestCompanyId();

    const body = await req.json();
    const forceCleanup = body.force_cleanup === true;

    const execution = await prisma.workflowExecution.create({
      data: {
        userId,
        companyId: companyId ?? undefined,
        workflowType: 'CLEANUP',
        workflowName: forceCleanup ? 'Manual Cleanup' : 'Scheduled Cleanup',
        status: 'RUNNING',
        inputData: JSON.stringify({ force_cleanup: forceCleanup }),
        startedAt: new Date(),
      },
    });

    const startTime = Date.now();
    const n8nResponse = await n8nClient.triggerCleanup({
      force_cleanup: forceCleanup,
      user_id: userId,
    });

    const results = n8nResponse.results as Record<string, unknown> | undefined;
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: n8nResponse.status === 'success' ? 'SUCCESS' : 'FAILED',
        n8nExecutionId: n8nResponse.execution_id !== 'error' ? n8nResponse.execution_id : null,
        outputData: JSON.stringify(n8nResponse),
        errorMessage: n8nResponse.error_message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      },
    });

    await prisma.cleanupLog.create({
      data: {
        executionId: execution.id,
        totalContacts: Number(results?.total_contacts ?? 0),
        deletedCount: Number(results?.deleted_count ?? 0),
        triggerType: forceCleanup ? 'manual' : 'scheduled',
      },
    });

    return NextResponse.json({ success: true, n8nResponse });
  } catch (error) {
    console.error('Cleanup trigger POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
