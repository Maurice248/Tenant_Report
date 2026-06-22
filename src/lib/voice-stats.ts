import type { SupabaseClient } from '@supabase/supabase-js';

const CALLED_STATUSES = new Set(['lifted', 'not_lifted', 'inactivity', 'max_duration_reached']);

type PhoneRow = {
  id: number;
  number: string | null;
  Name: string | null;
  status: string | null;
  user_sentiment: string | null;
  summary: string | null;
  recording_url: string | null;
  created_at: string | null;
};

export type VoiceStatsResponse = {
  total: number;
  statusCounts: Record<string, number>;
  sentimentCounts: Record<string, number>;
  recentCalls: Array<{
    id: number;
    number: string;
    Name: string;
    status: string;
    summary: string | null;
    user_sentiment: string | null;
    recording_url: string | null;
    date: string;
    created_at: string;
  }>;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function normalizeStatus(status: string | null | undefined): string {
  const value = String(status || '').trim().toLowerCase();
  if (!value || value === 'null') return 'pending';
  return value;
}

async function fetchAllPhoneRows(supabase: SupabaseClient): Promise<PhoneRow[]> {
  const pageSize = 1000;
  const rows: PhoneRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('phonenumber')
      .select('id, number, Name, status, user_sentiment, summary, recording_url, created_at')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as PhoneRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function getVoiceStats(supabase: SupabaseClient): Promise<VoiceStatsResponse> {
  const rows = await fetchAllPhoneRows(supabase);

  const statusCounts: Record<string, number> = {
    lifted: 0,
    not_lifted: 0,
    inactivity: 0,
    max_duration_reached: 0,
    pending: 0,
  };
  const sentimentCounts: Record<string, number> = {};

  for (const row of rows) {
    const status = normalizeStatus(row.status);
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const sentiment = row.user_sentiment?.trim() || 'Not Called';
    sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
  }

  const recentCalls = rows
    .filter((row) => {
      const status = normalizeStatus(row.status);
      return CALLED_STATUSES.has(status);
    })
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5)
    .map((row) => {
      const createdAt = row.created_at || new Date().toISOString();
      return {
        id: row.id,
        number: row.number || '',
        Name: row.Name || '',
        status: normalizeStatus(row.status),
        summary: row.summary,
        user_sentiment: row.user_sentiment,
        recording_url: row.recording_url,
        date: formatDate(createdAt),
        created_at: createdAt,
      };
    });

  return {
    total: rows.length,
    statusCounts,
    sentimentCounts,
    recentCalls,
  };
}
