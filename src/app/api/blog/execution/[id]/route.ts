export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getN8nExecutionState } from '@/lib/n8n-executions';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    const execution = await getN8nExecutionState(id.trim());
    return NextResponse.json({ execution });
  } catch (error) {
    console.error('[API blog/execution GET]', error);
    const message = error instanceof Error ? error.message : 'Failed to load execution status';
    const status = message.includes('N8N_API_KEY') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
