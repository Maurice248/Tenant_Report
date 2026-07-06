export type N8nExecutionStatus = 'running' | 'success' | 'error' | 'waiting' | 'canceled' | 'unknown';

export interface N8nExecutionState {
  id: string;
  status: N8nExecutionStatus;
  finished: boolean;
  startedAt?: string;
  stoppedAt?: string;
  errorMessage?: string;
}

import { getRequestN8nConfig } from '@/lib/company-integrations';

async function getN8nApiConfig() {
  const cfg = await getRequestN8nConfig();
  return {
    baseUrl: cfg.apiBaseUrl,
    apiKey: cfg.apiKey?.trim() ?? null,
  };
}

export async function isN8nExecutionPollingConfigured(): Promise<boolean> {
  const { apiKey } = await getN8nApiConfig();
  return Boolean(apiKey);
}

export async function getN8nExecutionState(executionId: string): Promise<N8nExecutionState> {
  const { baseUrl, apiKey } = await getN8nApiConfig();

  if (!apiKey) {
    throw new Error('n8n API key is not configured for execution polling.');
  }

  const response = await fetch(`${baseUrl}/api/v1/executions/${executionId}?includeData=false`, {
    headers: {
      Accept: 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
    cache: 'no-store',
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`n8n execution lookup failed (${response.status}): ${bodyText.slice(0, 200)}`);
  }

  const data = JSON.parse(bodyText) as {
    id?: string;
    status?: string;
    finished?: boolean;
    startedAt?: string;
    stoppedAt?: string;
    data?: { resultData?: { error?: { message?: string } } };
  };

  const status = (data.status ?? 'unknown') as N8nExecutionStatus;

  return {
    id: String(data.id ?? executionId),
    status,
    finished: Boolean(data.finished),
    startedAt: data.startedAt,
    stoppedAt: data.stoppedAt,
    errorMessage: data.data?.resultData?.error?.message,
  };
}

export function extractExecutionId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const obj = payload as Record<string, unknown>;
  const candidates = [obj.execution_id, obj.executionId, obj.id];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  if (obj.data && typeof obj.data === 'object') {
    return extractExecutionId(obj.data);
  }

  return null;
}
