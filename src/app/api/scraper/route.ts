export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface N8nScraperResponse {
  status: 'success' | 'error';
  execution_id?: string;
  scraper_summary?: {
    niches: string;
    location: string;
    total_scraped: number;
    verified_leads: number;
    invalid_leads: number;
    unknown_leads: number;
    success_rate: string;
  };
  sheet_info?: {
    sheet_tab: string;
    sheet_url: string;
    leads_added: number;
  };
  timestamp?: string;
  execution_time_seconds?: number;
  error_type?: string;
  error_message?: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = await getRequestUserId();


    const body = await req.json();
    const { niches, location, max_results, target_sheet } = body;

    if (!niches || !location || !max_results || !target_sheet) {
      return NextResponse.json({ error: 'Missing required fields: niches, location, max_results, target_sheet' }, { status: 400 });
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        userId: userId,
        workflowType: 'SCRAPER',
        workflowName: `${location} — ${niches}`,
        status: 'RUNNING',
        inputData: JSON.stringify(body),
        startedAt: new Date(),
      },
    });

    // Call n8n scraper webhook — 5 min timeout (scraping takes 2-5 min)
    let n8nRaw: Response;
    try {
      n8nRaw = await fetch(process.env.N8N_SCRAPER_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niches,
          location,
          max_results: Number(max_results),
          target_sheet,
          user_id: userId,
        }),
        signal: AbortSignal.timeout(310000), // 5m 10s
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'TimeoutError';
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', errorMessage: isTimeout ? 'Timeout' : 'Network error', completedAt: new Date() },
      });
      return NextResponse.json(
        { error: isTimeout ? 'Scraper timed out (>5 min). Try fewer results.' : 'Could not reach n8n webhook.' },
        { status: 503 }
      );
    }

    if (!n8nRaw.ok) {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      return NextResponse.json({ error: `n8n returned HTTP ${n8nRaw.status}` }, { status: 502 });
    }

    const n8nData: N8nScraperResponse = await n8nRaw.json();
    const duration = Date.now() - startTime;

    if (n8nData.status === 'error') {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorMessage: n8nData.error_message || 'n8n workflow error',
          outputData: JSON.stringify(n8nData),
          completedAt: new Date(),
          duration,
        },
      });
      return NextResponse.json({ error: n8nData.error_message || 'Scraper workflow failed' }, { status: 400 });
    }

    const summary = n8nData.scraper_summary;

    // Update execution
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        n8nExecutionId: n8nData.execution_id || null,
        outputData: JSON.stringify(n8nData),
        completedAt: new Date(),
        duration,
      },
    });

    // Save scraper job record
    await prisma.scraperJob.create({
      data: {
        executionId: execution.id,
        niches,
        location,
        maxResults: Number(max_results),
        totalScraped: summary?.total_scraped ?? 0,
        validEmails: summary?.verified_leads ?? 0,
        invalidEmails: summary?.invalid_leads ?? 0,
        targetSheet: target_sheet,
      },
    });

    return NextResponse.json({
      success: true,
      summary: n8nData.scraper_summary,
      sheetInfo: n8nData.sheet_info,
      executionId: n8nData.execution_id,
      executionTime: n8nData.execution_time_seconds,
    });

  } catch (error) {
    console.error('Scraper POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
