export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/executions/[id]
// Used for failed/pending executions that have no campaign record
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
      select: { userId: true, companyId: true },
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    const companyId = session.user.companyId ?? null;
    const inScope =
      (companyId && execution.companyId === companyId) || execution.userId === session.user.id;
    if (!inScope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.workflowExecution.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Execution DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
