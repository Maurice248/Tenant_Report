export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId, getRequestCompanyId } from '@/lib/auth';
import { executionRelationWhere } from '@/lib/workflow-scope';
import { prisma } from '@/lib/prisma';

// DELETE /api/campaigns/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = await getRequestCompanyId();
    const scope = executionRelationWhere(companyId, userId);

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { execution: { select: { userId: true, companyId: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only owner or same company can delete
    const inScope =
      (companyId && campaign.execution.companyId === companyId) ||
      campaign.execution.userId === userId;
    if (!inScope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Deleting campaign also deletes its execution (CASCADE)
    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Campaign DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/campaigns/[id] — fetch single campaign for reuse
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = await getRequestCompanyId();

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { execution: { select: { userId: true, companyId: true, inputData: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const inScope =
      (companyId && campaign.execution.companyId === companyId) ||
      campaign.execution.userId === userId;
    if (!inScope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return original form data for pre-filling
    const originalInput = campaign.execution.inputData
      ? JSON.parse(campaign.execution.inputData as string)
      : {};

    return NextResponse.json({ campaign, originalInput });
  } catch (error) {
    console.error('Campaign GET [id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
