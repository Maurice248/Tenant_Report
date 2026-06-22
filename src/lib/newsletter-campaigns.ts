import type { SupabaseClient } from '@supabase/supabase-js';

const LEAD_TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'] as const;

export type NewsletterCampaign = {
  id: number;
  template_id: string;
  subject_line: string;
  limit_for_daily: number;
  table_name: string;
};

export type NewsletterCampaignsResponse = {
  campaigns: NewsletterCampaign[];
  leadCounts: Record<string, number>;
};

export async function getNewsletterCampaigns(
  supabase: SupabaseClient
): Promise<NewsletterCampaignsResponse> {
  const { data: campaigns, error } = await supabase
    .from('newsletter_campaigns')
    .select('id, template_id, subject_line, limit_for_daily, table_name')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (error) throw error;

  const leadCounts: Record<string, number> = {};
  await Promise.all(
    LEAD_TABLES.map(async (table) => {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        leadCounts[table] = count ?? 0;
      }
    })
  );

  return {
    campaigns: (campaigns ?? []) as NewsletterCampaign[],
    leadCounts,
  };
}
