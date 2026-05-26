export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/notifications/error
// Returns the latest active global error from the database
export async function GET() {
  try {
    const latestError = await prisma.workflowExecution.findFirst({
      where: { workflowType: 'GLOBAL_ERROR' },
      orderBy: { createdAt: 'desc' },
      select: { errorMessage: true }
    });

    return NextResponse.json({ message: latestError?.errorMessage || null });
  } catch (err) {
    console.error('[API] GET global error error:', err);
    return NextResponse.json({ message: null });
  }
}

// POST /api/notifications/error
// Receives error from n8n and stores it in the database via Prisma
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message || body?.Error || body?.error || null;
    
    if (message) {
      // Find the administrator user to link the execution record
      let user = await prisma.user.findUnique({ where: { email: 'togahealthai@gmail.com' } });
      if (!user) {
        user = await prisma.user.findFirst();
      }

      if (!user) {
        console.error('[API] No users found in database to link error execution.');
        return NextResponse.json({ error: 'Database has no users' }, { status: 500 });
      }

      // First clean up any older global errors
      await prisma.workflowExecution.deleteMany({
        where: { workflowType: 'GLOBAL_ERROR' }
      });

      // Create a fresh global error execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          userId: user.id,
          workflowType: 'GLOBAL_ERROR',
          workflowName: 'Global n8n Workflow Error',
          status: 'FAILED',
          inputData: '{}',
          errorMessage: message
        }
      });

      return NextResponse.json({ success: true, message: execution.errorMessage });
    }

    return NextResponse.json({ success: true, message: null });
  } catch (error: any) {
    console.error('[API] POST global error error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save global error' }, { status: 500 });
  }
}

// DELETE /api/notifications/error
// Clears the active global error from the database
export async function DELETE() {
  try {
    await prisma.workflowExecution.deleteMany({
      where: { workflowType: 'GLOBAL_ERROR' }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] DELETE global error error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to clear global error' }, { status: 500 });
  }
}
