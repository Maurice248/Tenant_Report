'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Phone,
  PhoneOff,
  Clock,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; textColor: string }
> = {
  lifted: { label: 'Lifted', color: '#22c55e', bg: 'bg-emerald-50', textColor: 'text-emerald-700' },
  not_lifted: { label: 'Not Lifted', color: '#f87171', bg: 'bg-red-50', textColor: 'text-red-600' },
  inactivity: { label: 'Inactivity', color: '#f59e0b', bg: 'bg-amber-50', textColor: 'text-amber-700' },
  max_duration_reached: {
    label: 'Max Duration',
    color: '#8b5cf6',
    bg: 'bg-violet-50',
    textColor: 'text-violet-700',
  },
  pending: { label: 'Pending', color: '#94a3b8', bg: 'bg-gray-50', textColor: 'text-gray-600' },
};

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: '#22c55e',
  Neutral: '#3b82f6',
  Negative: '#ef4444',
  Unknown: '#9ca3af',
  'Not Called': '#e2e8f0',
};

const WEBHOOKS = {
  deleteInactivity: process.env.NEXT_PUBLIC_N8N_DELETE_INACTIVITY_URL || '',
  notLiftedToNull: process.env.NEXT_PUBLIC_N8N_NOT_LIFTED_TO_NULL_URL || '',
  statusChangeToNull: process.env.NEXT_PUBLIC_N8N_ALL_STATUS_TO_NULL_URL || '',
};

interface VoiceStats {
  total: number;
  statusCounts: Record<string, number>;
  sentimentCounts: Record<string, number>;
  recentCalls: Array<{
    id: number;
    number: string;
    Name: string;
    status: string;
    user_sentiment: string | null;
    created_at: string;
  }>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export default function VoiceDashboard() {
  const [data, setData] = useState<VoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inactivityRemoved, setInactivityRemoved] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/supabase/voice-stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError('Failed to load voice stats'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runWebhook = async (key: keyof typeof WEBHOOKS, label: string) => {
    const url = WEBHOOKS[key];
    if (!url) {
      setMessage({ type: 'error', text: `${label} webhook URL not configured yet.` });
      return;
    }
    setActionLoading(key);
    setMessage(null);
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setMessage({ type: 'success', text: `${label} completed successfully.` });
      if (key === 'deleteInactivity') setInactivityRemoved(true);
      load();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading voice analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusChart = ['lifted', 'not_lifted', 'inactivity', 'max_duration_reached']
    .map((key) => ({ key, value: data?.statusCounts[key] ?? 0 }))
    .filter(({ value }) => value > 0)
    .map(({ key, value }) => ({
      name: STATUS_CONFIG[key].label,
      value,
      fill: STATUS_CONFIG[key].color,
    }));

  const sentimentChart = Object.entries(data?.sentimentCounts || {})
    .filter(([name, count]) => name !== 'Not Called' && count > 0)
    .map(([name, value]) => ({ name, value, fill: SENTIMENT_COLORS[name] || '#94a3b8' }));

  const calledTotal =
    (data?.statusCounts.lifted || 0) +
    (data?.statusCounts.not_lifted || 0) +
    (data?.statusCounts.inactivity || 0);
  const liftRate = calledTotal > 0 ? (((data?.statusCounts.lifted || 0) / calledTotal) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4" style={{ marginTop: 25 }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Agent Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Phone outreach analytics from{' '}
            <span className="font-medium text-gray-700">phonenumber</span> table
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div
        className="grid grid-cols-2 items-stretch gap-3 md:gap-4 lg:grid-cols-5"
        style={{ marginTop: 40, marginBottom: 40 }}
      >
        <MetricCard
          label="Total Leads"
          value={data?.total.toLocaleString() ?? '0'}
          theme="indigo"
          icon={Users}
        />
        <MetricCard
          label="Lifted"
          value={String(data?.statusCounts.lifted ?? 0)}
          sub={`${liftRate}% lift rate`}
          theme="emerald"
          icon={Phone}
        />
        <MetricCard
          label="Not Lifted"
          value={String(data?.statusCounts.not_lifted ?? 0)}
          theme="red"
          icon={PhoneOff}
        />
        <MetricCard
          label="Inactivity"
          value={String(data?.statusCounts.inactivity ?? 0)}
          theme="amber"
          icon={Clock}
        />
        <MetricCard
          label="Max Duration"
          value={String(data?.statusCounts.max_duration_reached ?? 0)}
          theme="violet"
          icon={Clock}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Call Status Distribution" data={statusChart} />
        <ChartCard title="Caller Sentiment" data={sentimentChart} emptyText="No sentiment data yet" />
      </div>

      {(data?.recentCalls?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Recent Calls</p>
            <span className="text-xs text-gray-400">Latest 5</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Name', 'Number', 'Status', 'Sentiment', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.recentCalls.map((call) => {
                  const statusKey = String(call.status || '').toLowerCase();
                  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
                  const sentiment = call.user_sentiment || '';
                  const sentimentColor = SENTIMENT_COLORS[sentiment] || '#94a3b8';
                  return (
                    <tr key={call.id} className="transition-colors hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-800">{call.Name || '—'}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{call.number || '—'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${status.bg} ${status.textColor}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {call.user_sentiment ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium"
                            style={{ color: sentimentColor }}
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: sentimentColor }}
                            />
                            {sentiment}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {call.created_at ? formatDate(call.created_at) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col items-end gap-3">
        {message && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              message.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => runWebhook('deleteInactivity', 'Remove Inactivity')}
            disabled={actionLoading !== null || inactivityRemoved}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              inactivityRemoved
                ? 'border border-gray-200 bg-gray-100 text-gray-400'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {inactivityRemoved ? 'Inactivity Removed ✓' : 'Remove Inactivity'}
          </button>
          {inactivityRemoved && (
            <>
              <button
                type="button"
                onClick={() => runWebhook('notLiftedToNull', 'Not Lifted → Null')}
                disabled={actionLoading !== null}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Not Lifted → Null
              </button>
              <button
                type="button"
                onClick={() => runWebhook('statusChangeToNull', 'Status Change → Null')}
                disabled={actionLoading !== null}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                All Status → Null
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  theme,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  theme: 'indigo' | 'emerald' | 'red' | 'amber' | 'violet';
  icon: LucideIcon;
}) {
  const themes = {
    indigo: {
      card: 'bg-indigo-50 border-indigo-100',
      value: 'text-indigo-700',
      iconWrap: 'bg-indigo-100',
      icon: 'text-indigo-600',
      sub: 'text-emerald-400',
    },
    emerald: {
      card: 'bg-emerald-50 border-emerald-100',
      value: 'text-emerald-700',
      iconWrap: 'bg-emerald-100',
      icon: 'text-emerald-600',
      sub: 'text-emerald-400',
    },
    red: {
      card: 'bg-red-50 border-red-100',
      value: 'text-red-600',
      iconWrap: 'bg-red-100',
      icon: 'text-red-500',
      sub: 'text-red-400',
    },
    amber: {
      card: 'bg-amber-50 border-amber-100',
      value: 'text-amber-700',
      iconWrap: 'bg-amber-100',
      icon: 'text-amber-600',
      sub: 'text-amber-400',
    },
    violet: {
      card: 'bg-violet-50 border-violet-100',
      value: 'text-violet-700',
      iconWrap: 'bg-violet-100',
      icon: 'text-violet-600',
      sub: 'text-violet-400',
    },
  };
  const t = themes[theme];

  return (
    <div
      className={`flex h-full flex-col justify-between rounded-2xl border ${t.card}`}
      style={{
        padding: '20px 24px',
        minHeight: 112,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className="min-w-0 flex-1 text-[11px] font-bold uppercase leading-snug text-gray-500 opacity-75"
          style={{ letterSpacing: '0.05em' }}
        >
          {label}
        </p>
        <span className={`shrink-0 rounded-lg p-1.5 ${t.iconWrap}`}>
          <Icon className={`h-4 w-4 ${t.icon}`} strokeWidth={2} />
        </span>
      </div>
      <div style={{ paddingTop: 8 }}>
        <p className={`text-[26px] font-extrabold leading-tight tracking-tight ${t.value}`}>{value}</p>
        <p className={`mt-1 min-h-[16px] text-xs ${sub ? t.sub : 'text-transparent select-none'}`}>
          {sub || '\u00A0'}
        </p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  emptyText,
}: {
  title: string;
  data: Array<{ name: string; value: number; fill: string }>;
  emptyText?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-gray-700">{title}</p>
      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#f9fafb',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {data.map((item) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.fill }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{item.value.toLocaleString()}</span>
                    <span className="w-8 text-right text-gray-400">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-gray-400">{emptyText || 'No data'}</div>
      )}
    </div>
  );
}
