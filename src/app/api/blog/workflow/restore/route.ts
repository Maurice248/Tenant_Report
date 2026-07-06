export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  extractEditableNodes,
  isN8nWorkflowApiConfigured,
  loadBlogWorkflow,
  restoreTenantReportWorkflowPrompts,
  scanLegacyBrandInEditableNodes,
} from '@/lib/n8n-workflows';

export async function POST(request: NextRequest) {
  try {
    if (!(await isN8nWorkflowApiConfigured())) {
      return NextResponse.json(
        { error: 'n8n API key is not configured for workflow editing.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const workflowId =
      typeof body.workflowId === 'string' ? body.workflowId.trim() : undefined;

    const workflow = await restoreTenantReportWorkflowPrompts(workflowId);
    const editableNodes = extractEditableNodes(workflow.nodes, workflow.connections);
    const legacyBrandNodes = scanLegacyBrandInEditableNodes(workflow.nodes);

    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      workflowName: workflow.name,
      active: workflow.active,
      editableNodes,
      legacyBrandDetected: legacyBrandNodes.length > 0,
      legacyBrandNodes,
      message: workflow.active
        ? 'Tenant Report prompts restored and workflow re-published in n8n.'
        : 'Tenant Report prompts and code restored from the bundled workflow template.',
    });
  } catch (error) {
    console.error('[API blog/workflow/restore POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restore workflow template' },
      { status: 502 }
    );
  }
}
