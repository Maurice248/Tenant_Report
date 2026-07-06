export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { getBlogCategoryById } from '@/lib/blog-categories';
import { fetchBlogCategoriesFromWorkflow } from '@/lib/blog-category-source';
import { extractExecutionId } from '@/lib/n8n-executions';
import { getRequestN8nConfig, getN8nWebhook } from '@/lib/company-integrations';

interface N8nErrorBody {
  message?: string;
  error?: string;
  code?: number;
  hint?: string;
}

function parseN8nError(status: number, responseText: string, webhookUrl: string): string {
  let body: N8nErrorBody | null = null;
  try {
    body = responseText ? (JSON.parse(responseText) as N8nErrorBody) : null;
  } catch {
    body = null;
  }

  const message = body?.message ?? body?.error ?? responseText.trim();
  const isTestUrl = webhookUrl.includes('/webhook-test/');

  if (message.includes('No Respond to Webhook node found')) {
    return [
      'The n8n workflow is missing a "Respond to Webhook" node.',
      'Add one at the end of the workflow (or after the trigger) so the dashboard can detect completion.',
    ].join(' ');
  }

  if (status === 404) {
    if (isTestUrl) {
      return [
        'n8n test webhook is not listening.',
        'Open the workflow in n8n, click "Listen for test event" on the Webhook node, then try again.',
        'For production use, switch to the Production URL (/webhook/...) and activate the workflow.',
      ].join(' ');
    }

    return [
      message || 'Webhook not registered.',
      'Add a Webhook trigger to your blog workflow, set path to "blog-automation", activate the workflow,',
      'then use the Production URL: https://<host>/webhook/blog-automation',
    ].join(' ');
  }

  if (status === 401 || status === 403) {
    return message || 'n8n rejected the request (authentication required).';
  }

  if (message) {
    return `n8n error (${status}): ${message}`;
  }

  return `n8n returned HTTP ${status}. Check the workflow execution logs in n8n.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const categoryId = Number(body.categoryId);

    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    const { categories } = await fetchBlogCategoriesFromWorkflow();
    const category = getBlogCategoryById(categoryId, categories);
    if (!category) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const n8n = await getRequestN8nConfig();
    const webhookUrl = getN8nWebhook(n8n, 'N8N_BLOG_AUTOMATION_WEBHOOK_URL');
    const payload = {
      category: category.category,
      service: category.service,
      categoryType: category.service,
      seed_keyword: category.seed_keyword,
      keywords: category.keywords,
      categoryId: category.id,
      categoryIndex: category.id,
      totalCategories: categories.length,
      day: category.id,
      source: 'dashboard',
    };

    if (!webhookUrl) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'Category selected. Configure the Blog automation webhook in API key management to trigger the n8n workflow.',
        category,
        payload,
      });
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(295000),
    });

    const responseText = await n8nResponse.text();
    console.log(
      `[API blog/generate] n8n ${n8nResponse.status} → ${webhookUrl}`,
      responseText.slice(0, 500)
    );

    let responseJson: unknown = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = { raw: responseText };
    }

    if (!n8nResponse.ok) {
      const error = parseN8nError(n8nResponse.status, responseText, webhookUrl);
      return NextResponse.json(
        {
          error,
          n8nStatus: n8nResponse.status,
          details: responseJson,
          webhookUrl: webhookUrl.replace(/\/webhook-test\//, '/webhook/'),
        },
        { status: 502 }
      );
    }

    const executionId = extractExecutionId(responseJson);

    return NextResponse.json({
      success: true,
      configured: true,
      category,
      executionId,
      n8nResponse: responseJson,
    });
  } catch (error) {
    console.error('[API blog/generate POST]', error);
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json(
      {
        error: isTimeout
          ? 'Blog workflow timed out after 5 minutes. It may still be running in n8n — check execution logs.'
          : error instanceof Error
            ? error.message
            : 'Failed to start blog generation',
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
