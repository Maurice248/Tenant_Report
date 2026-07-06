export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId, getRequestCompanyId } from '@/lib/auth';
import { executionRelationWhere } from '@/lib/workflow-scope';
import { prisma } from '@/lib/prisma';
import { getRequestN8nConfig, getN8nWebhook } from '@/lib/company-integrations';


function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeScraperPayload(
  raw: unknown,
  fallback: { niches: string; location: string; target_sheet: string }
) {
  const root = Array.isArray(raw) ? raw[0] : raw;
  if (!root || typeof root !== 'object') {
    return { status: 'error' as const, error_message: 'Invalid n8n response format' };
  }

  const obj = root as Record<string, unknown>;
  const status = String(obj.status ?? 'success').toLowerCase();
  if (status === 'error' || status === 'failed') {
    return {
      status: 'error' as const,
      error_message: String(obj.error_message ?? obj.error ?? 'Scraper workflow failed'),
    };
  }

  const supabaseRaw = (obj.supabase_info ?? obj.supabaseInfo) as Record<string, unknown> | undefined;
  const emailStatsRaw = (obj.email_verification_stats ?? obj.emailVerificationStats) as Record<string, unknown> | undefined;
  const summaryRaw = (obj.scraper_summary ?? obj.summary) as Record<string, unknown> | undefined;
  const sheetRaw = (obj.sheet_info ?? obj.sheetInfo) as Record<string, unknown> | undefined;

  const totalScraped = num(
    supabaseRaw?.total_leads_scraped ?? supabaseRaw?.totalLeadsScraped ??
    summaryRaw?.total_scraped ?? summaryRaw?.totalScraped
  );
  const verifiedLeads = num(
    emailStatsRaw?.verified ??
    summaryRaw?.verified_leads ?? summaryRaw?.verifiedLeads
  );
  const invalidLeads = num(
    emailStatsRaw?.invalid ??
    summaryRaw?.invalid_leads ?? summaryRaw?.invalidLeads
  );
  const unknownLeads = emailStatsRaw
    ? num(emailStatsRaw.unknown) + num(emailStatsRaw.catch_all ?? emailStatsRaw.catchAll)
    : num(summaryRaw?.unknown_leads ?? summaryRaw?.unknownLeads);

  let successRate = summaryRaw?.success_rate ?? summaryRaw?.successRate;
  if (typeof successRate !== 'string' || !successRate.trim()) {
    successRate = totalScraped > 0
      ? `${Math.round((verifiedLeads / totalScraped) * 100)}%`
      : '0%';
  } else if (!String(successRate).includes('%')) {
    successRate = `${successRate}%`;
  }

  const leadsAdded = num(
    sheetRaw?.leads_added ?? sheetRaw?.leadsAdded,
    verifiedLeads > 0 ? verifiedLeads : totalScraped
  );

  return {
    status: String(obj.status ?? 'success'),
    execution_id: obj.execution_id ? String(obj.execution_id) : undefined,
    timestamp: obj.timestamp ? String(obj.timestamp) : undefined,
    execution_time_seconds: num(obj.execution_time_seconds ?? obj.executionTime, 0) || undefined,
    supabase_info: {
      total_leads_requested: num(
        supabaseRaw?.total_leads_requested ?? supabaseRaw?.totalLeadsRequested
      ),
      total_leads_scraped: totalScraped,
      save_status: String(supabaseRaw?.save_status ?? supabaseRaw?.saveStatus ?? 'unknown'),
    },
    email_verification_stats: emailStatsRaw
      ? {
          verified: num(emailStatsRaw.verified),
          catch_all: num(emailStatsRaw.catch_all ?? emailStatsRaw.catchAll),
          invalid: num(emailStatsRaw.invalid),
          unknown: num(emailStatsRaw.unknown),
          bounce_risk_removed: num(emailStatsRaw.bounce_risk_removed ?? emailStatsRaw.bounceRiskRemoved),
        }
      : undefined,
    scraper_summary: {
      niches: String(summaryRaw?.niches ?? fallback.niches),
      location: String(summaryRaw?.location ?? fallback.location),
      total_scraped: totalScraped,
      verified_leads: verifiedLeads,
      invalid_leads: invalidLeads,
      unknown_leads: unknownLeads,
      success_rate: String(successRate),
    },
    sheet_info: {
      sheet_tab: String(
        sheetRaw?.sheet_tab ?? sheetRaw?.sheetTab ?? fallback.target_sheet
      ),
      sheet_url: String(sheetRaw?.sheet_url ?? sheetRaw?.sheetUrl ?? ''),
      leads_added: leadsAdded,
    },
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = await getRequestCompanyId();

    const body = await req.json();
    const { niches, location, max_results, target_sheet } = body;

    if (!niches || !location || !max_results || !target_sheet) {
      return NextResponse.json({ error: 'Missing required fields: niches, location, max_results, target_sheet' }, { status: 400 });
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        userId: userId,
        companyId: companyId ?? undefined,
        workflowType: 'SCRAPER',
        workflowName: `${location} — ${niches}`,
        status: 'RUNNING',
        inputData: JSON.stringify(body),
        startedAt: new Date(),
      },
    });

    const n8n = await getRequestN8nConfig();
    const scraperWebhookUrl = getN8nWebhook(n8n, 'N8N_SCRAPER_WEBHOOK_URL');
    if (!scraperWebhookUrl) {
      return NextResponse.json(
        { error: 'Lead scraper webhook is not configured in API key management.' },
        { status: 503 }
      );
    }

    // Call n8n scraper webhook — 5 min timeout (scraping takes 2-5 min)
    let n8nRaw: Response;
    try {
      n8nRaw = await fetch(scraperWebhookUrl, {
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

    const n8nData = normalizeScraperPayload(await n8nRaw.json(), {
      niches,
      location,
      target_sheet,
    });
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
      status: n8nData.status,
      timestamp: n8nData.timestamp,
      executionTime: n8nData.execution_time_seconds,
      destination: target_sheet,
      location,
      niches,
      supabaseInfo: n8nData.supabase_info,
      emailVerification: n8nData.email_verification_stats,
      summary: summary,
    });

  } catch (error) {
    console.error('Scraper POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
