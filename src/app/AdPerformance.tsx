"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, Badge, SectionTitle, EmptyState, Spinner } from "./components";

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const CHART_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];

type AdInsights = {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_click_ctr?: string;
  cpc?: string;
  cpm?: string;
  leads?: string;
  linkClicks?: string;
};

type AdRow = {
  id: string;
  name: string;
  effective_status: string;
  thumbnail?: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  insights: AdInsights;
};

type AdsetGroup = {
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  ads: AdRow[];
};

function truncateLabel(name: string, max = 18) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function formatMoney(val: string | number | undefined) {
  return `$${parseFloat(String(val || 0)).toFixed(2)}`;
}

function formatNum(val: string | number | undefined) {
  return parseFloat(String(val || 0)).toLocaleString();
}

function formatPct(val: string | number | undefined) {
  return `${parseFloat(String(val || 0)).toFixed(2)}%`;
}

function AdComparisonChart({ group }: { group: AdsetGroup }) {
  const chartData = group.ads.map((ad) => ({
    name: truncateLabel(ad.name),
    fullName: ad.name,
    Spend: parseFloat(ad.insights.spend || "0"),
    Clicks: parseFloat(ad.insights.clicks || "0"),
    Impressions: parseFloat(ad.insights.impressions || "0"),
    CTR: parseFloat(ad.insights.inline_link_click_ctr || "0"),
  }));

  if (chartData.length === 0) return null;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{group.adsetName}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          Campaign: {group.campaignName} · {group.ads.length} ad{group.ads.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div style={{ padding: "16px 12px 20px" }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card-bg)",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                if (name === "Spend") return [formatMoney(value), name];
                if (name === "CTR") return [formatPct(value), name];
                return [formatNum(value), name];
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Spend" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Clicks" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Impressions" fill="#d97706" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {chartData.length >= 2 && (
          <div style={{ marginTop: 8, padding: "12px 14px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
              CTR Comparison
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {chartData
                .slice()
                .sort((a, b) => b.CTR - a.CTR)
                .map((row, i) => {
                  const maxCtr = Math.max(...chartData.map((r) => r.CTR), 0.01);
                  const widthPct = Math.max(4, (row.CTR / maxCtr) * 100);
                  return (
                    <div key={row.fullName} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 120, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {truncateLabel(row.fullName, 16)}
                      </div>
                      <div style={{ flex: 1, height: 10, background: "var(--border-light)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${widthPct}%`, height: "100%", background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 99 }} />
                      </div>
                      <div style={{ width: 52, textAlign: "right", fontSize: 12, fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length] }}>
                        {formatPct(row.CTR)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function AdPerformance() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [rangeMeta, setRangeMeta] = useState<{ since: string; until: string } | null>(null);
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterAdset, setFilterAdset] = useState("all");

  const fetchPerformance = useCallback(async (selectedDays: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/meta/ad-performance?days=${selectedDays}`);
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns || []);
        setRangeMeta({ since: data.since, until: data.until });
      } else {
        setError(data.error || "Failed to fetch ad performance");
        setCampaigns([]);
      }
    } catch {
      setError("Failed to connect to API");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance(days);
  }, [days, fetchPerformance]);

  const allAds = useMemo<AdRow[]>(() => {
    const rows: AdRow[] = [];
    for (const campaign of campaigns) {
      for (const adset of campaign.adsets || []) {
        for (const ad of adset.ads || []) {
          rows.push({
            id: ad.id,
            name: ad.name,
            effective_status: ad.effective_status,
            thumbnail: ad.creative?.thumbnail_url,
            campaignId: campaign.id,
            campaignName: campaign.name,
            adsetId: adset.id,
            adsetName: adset.name,
            insights: ad.insights || {},
          });
        }
      }
    }
    return rows;
  }, [campaigns]);

  const campaignOptions = useMemo(() => {
    const map = new Map<string, string>();
    allAds.forEach((ad) => map.set(ad.campaignId, ad.campaignName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allAds]);

  const adsetOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; campaignId: string }>();
    allAds.forEach((ad) => {
      if (filterCampaign === "all" || ad.campaignId === filterCampaign) {
        map.set(ad.adsetId, { id: ad.adsetId, name: ad.adsetName, campaignId: ad.campaignId });
      }
    });
    return Array.from(map.values());
  }, [allAds, filterCampaign]);

  useEffect(() => {
    if (filterAdset !== "all" && !adsetOptions.some((a) => a.id === filterAdset)) {
      setFilterAdset("all");
    }
  }, [adsetOptions, filterAdset]);

  const filteredAds = useMemo(() => {
    return allAds.filter((ad) => {
      if (filterCampaign !== "all" && ad.campaignId !== filterCampaign) return false;
      if (filterAdset !== "all" && ad.adsetId !== filterAdset) return false;
      return true;
    });
  }, [allAds, filterCampaign, filterAdset]);

  const adsetGroups = useMemo<AdsetGroup[]>(() => {
    const groups = new Map<string, AdsetGroup>();
    filteredAds.forEach((ad) => {
      if (!groups.has(ad.adsetId)) {
        groups.set(ad.adsetId, {
          adsetId: ad.adsetId,
          adsetName: ad.adsetName,
          campaignId: ad.campaignId,
          campaignName: ad.campaignName,
          ads: [],
        });
      }
      groups.get(ad.adsetId)!.ads.push(ad);
    });
    return Array.from(groups.values()).filter((g) => g.ads.length > 0);
  }, [filteredAds]);

  const totals = useMemo(() => {
    return filteredAds.reduce(
      (acc, ad) => {
        acc.spend += parseFloat(ad.insights.spend || "0");
        acc.impressions += parseFloat(ad.insights.impressions || "0");
        acc.clicks += parseFloat(ad.insights.clicks || "0");
        acc.leads += parseFloat(ad.insights.leads || "0");
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, leads: 0 }
    );
  }, [filteredAds]);

  const avgCtr =
    filteredAds.length > 0
      ? filteredAds.reduce((sum, ad) => sum + parseFloat(ad.insights.inline_link_click_ctr || "0"), 0) /
        filteredAds.length
      : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filters row */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Date range
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: `1.5px solid ${days === d ? "var(--primary)" : "var(--border)"}`,
                    background: days === d ? "var(--primary-light)" : "#fff",
                    color: days === d ? "var(--primary)" : "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {d === 1 ? "1 day" : `${d} days`}
                </button>
              ))}
            </div>
            {rangeMeta && (
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
                {rangeMeta.since} → {rangeMeta.until}
              </div>
            )}
          </div>

          <div style={{ minWidth: 180, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Campaign
            </div>
            <select
              value={filterCampaign}
              onChange={(e) => {
                setFilterCampaign(e.target.value);
                setFilterAdset("all");
              }}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", fontSize: 13 }}
            >
              <option value="all">All campaigns</option>
              {campaignOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 180, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Ad set
            </div>
            <select
              value={filterAdset}
              onChange={(e) => setFilterAdset(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", fontSize: 13 }}
            >
              <option value="all">All ad sets</option>
              {adsetOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchPerformance(days)}
            disabled={loading}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            {loading ? <Spinner size={12} /> : "↻"} Refresh
          </button>
        </div>
      </Card>

      {error && (
        <Card style={{ background: "var(--red-light)", border: "1px solid var(--red-strong)" }}>
          <div style={{ color: "var(--red-strong)", fontSize: 14 }}>{error}</div>
        </Card>
      )}

      {loading && filteredAds.length === 0 && !error && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px", gap: 12 }}>
            <Spinner size={28} color="var(--primary)" />
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading ad performance from Meta…</div>
          </div>
        </Card>
      )}

      {!loading && filteredAds.length === 0 && !error && (
        <Card>
          <EmptyState title="No ads found" sub="Adjust filters or launch ads in Campaign Setup." />
        </Card>
      )}

      {filteredAds.length > 0 && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {[
              { label: "Total Spend", value: formatMoney(totals.spend), color: "var(--primary)" },
              { label: "Impressions", value: formatNum(totals.impressions), color: "var(--text)" },
              { label: "Clicks", value: formatNum(totals.clicks), color: "var(--green)" },
              { label: "Avg CTR", value: formatPct(avgCtr), color: "var(--amber)" },
              { label: "Leads", value: formatNum(totals.leads), color: "var(--green)" },
              { label: "Ads tracked", value: String(filteredAds.length), color: "var(--text)" },
            ].map((kpi) => (
              <Card key={kpi.label} style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{kpi.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
              </Card>
            ))}
          </div>

          {/* Comparative charts by ad set */}
          <div>
            <SectionTitle style={{ marginBottom: 10 }}>Ad set comparison</SectionTitle>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Side-by-side metrics for ads within the same campaign and ad set.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {adsetGroups.map((group) => (
                <AdComparisonChart key={group.adsetId} group={group} />
              ))}
            </div>
          </div>

          {/* All ads table */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border-light)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>All ads</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: "var(--card-bg)" }}>
                    {["Ad", "Campaign", "Ad set", "Status", "Spend", "Impr.", "Clicks", "CTR", "CPC", "Leads"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: h === "Ad" || h === "Campaign" || h === "Ad set" || h === "Status" ? "left" : "right",
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 11,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.map((ad) => (
                    <tr key={ad.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: "#000", overflow: "hidden", flexShrink: 0 }}>
                            {ad.thumbnail ? (
                              <img src={ad.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎬</div>
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{ad.name}</div>
                            <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "monospace" }}>{ad.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.campaignName}</td>
                      <td style={{ padding: "10px 14px", color: "var(--text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.adsetName}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge
                          text={ad.effective_status}
                          color={ad.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"}
                          bg={ad.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"}
                        />
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>{formatMoney(ad.insights.spend)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatNum(ad.insights.impressions)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatNum(ad.insights.clicks)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>{formatPct(ad.insights.inline_link_click_ctr)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatMoney(ad.insights.cpc)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--green)", fontWeight: 700 }}>{formatNum(ad.insights.leads)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
