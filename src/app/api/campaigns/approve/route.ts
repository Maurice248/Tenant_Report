export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequestUserId();

    const body = await req.json();
    const { campaignId, decision, comments } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    if (!decision || !['approved', 'rejected'].includes(decision.toLowerCase())) {
      return NextResponse.json(
        { error: 'decision must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { execution: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.execution.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (campaign.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `Campaign is already ${campaign.status}` },
        { status: 400 }
      );
    }

    // Handle rejection — no n8n call needed
    if (decision.toLowerCase() === 'rejected') {
      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'REJECTED',
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: comments || 'No reason provided',
        },
      });
      return NextResponse.json({ success: true, campaign: updated, message: 'Campaign rejected' });
    }

    // Handle approval — call n8n Workflow 2
    const executionOutput = campaign.execution.outputData
      ? JSON.parse(campaign.execution.outputData as string)
      : {};

    const approvalPayload = {
      execution_id: campaign.execution.n8nExecutionId,
      decision: 'approved',
      user_id: userId,
      comments: comments || '',
      campaign_data: {
        campaign_name: campaign.campaignName,
        service_type: campaign.serviceType,
        target_region: campaign.targetRegion,
        selected_sheet: campaign.selectedSheet,
        ...(campaign.aiGeneratedContent ? JSON.parse(campaign.aiGeneratedContent) : {}),
        sheet_url: executionOutput?.sheet_info?.sheet_url,
        sheet_tab: executionOutput?.sheet_info?.sheet_tab,
        sheet_gid: executionOutput?.sheet_info?.sheet_gid,
      },
    };

    const n8nResponse = await axios.post(
      process.env.N8N_APPROVAL_WEBHOOK_URL!,
      approvalPayload,
      { headers: { 'Content-Type': 'application/json' }, timeout: 120000 }
    );

    const n8nData = n8nResponse.data;

    // Log approval execution
    await prisma.workflowExecution.create({
      data: {
        userId,
        workflowType: 'CAMPAIGN_APPROVAL',
        workflowName: `Approve: ${campaign.campaignName}`,
        status: n8nData.status === 'success' ? 'SUCCESS' : 'FAILED',
        inputData: JSON.stringify(approvalPayload),
        outputData: JSON.stringify(n8nData),
        n8nExecutionId: n8nData.execution_id || null,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        comments: comments || null,
      },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
      n8nResponse: n8nData,
      message: 'Campaign approved and emails are being sent',
    });
  } catch (error) {
    console.error('Approval error:', error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: 'Failed to reach n8n approval workflow', details: error.response?.data || error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
