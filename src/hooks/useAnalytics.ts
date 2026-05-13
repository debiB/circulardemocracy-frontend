import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";

interface AnalyticsData {
  totalMessages: number;
  repliesSent: number;
  pendingReplies: number;
  messagesByDay: Array<{
    date: string;
    count: number;
  }>;
  messagesByCampaign: Array<{
    campaignId: number;
    campaignName: string;
    count: number;
  }>;
  dailyCampaignData?: Array<{
    date: string;
    campaigns: { [campaignName: string]: number };
  }>;
}

interface AnalyticsDailyRow {
  date: string;
  campaign_id: number | null;
  campaign_name: string | null;
  message_count: number;
}

const emptyAnalytics = (): AnalyticsData => ({
  totalMessages: 0,
  repliesSent: 0,
  pendingReplies: 0,
  messagesByDay: [],
  messagesByCampaign: [],
  dailyCampaignData: [],
});

function buildAnalytics(rows: AnalyticsDailyRow[]): AnalyticsData {
  if (!rows.length) {
    return emptyAnalytics();
  }

  const byDay = new Map<string, number>();
  const byCampaign = new Map<number, { campaignName: string; count: number }>();
  const byDayCampaign = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const count = Number(row.message_count || 0);
    const date = row.date.slice(0, 10);
    const campaignId = row.campaign_id;
    const campaignName = row.campaign_name ?? "Unknown";

    byDay.set(date, (byDay.get(date) ?? 0) + count);

    if (campaignId !== null) {
      const currentCampaign = byCampaign.get(campaignId);
      byCampaign.set(campaignId, {
        campaignName,
        count: (currentCampaign?.count ?? 0) + count,
      });
    }

    const dailyCampaigns = byDayCampaign.get(date) ?? {};
    dailyCampaigns[campaignName] = (dailyCampaigns[campaignName] ?? 0) + count;
    byDayCampaign.set(date, dailyCampaigns);
  }

  const messagesByDay = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const messagesByCampaign = Array.from(byCampaign.entries())
    .sort(([a], [b]) => a - b)
    .map(([campaignId, { campaignName, count }]) => ({
      campaignId,
      campaignName,
      count,
    }));

  const dailyCampaignData = Array.from(byDayCampaign.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, campaigns]) => ({ date, campaigns }));

  const totalMessages = messagesByDay.reduce((sum, row) => sum + row.count, 0);

  return {
    totalMessages,
    repliesSent: 0,
    pendingReplies: totalMessages,
    messagesByDay,
    messagesByCampaign,
    dailyCampaignData,
  };
}

export type AnalyticsTimeBucket = "day" | "week";

async function fetchAnalytics(
  timeBucket: AnalyticsTimeBucket,
): Promise<AnalyticsData> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    const sourceView =
      timeBucket === "week"
        ? "message_analytics_weekly_view"
        : "message_analytics_view";
    let query = getSupabase()
      .from(sourceView)
      .select("date, campaign_id, campaign_name, message_count");

    if (timeBucket === "day") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte("date", sevenDaysAgo.toISOString());
    }

    const { data, error } = await query.order("date", { ascending: true });

    if (error) {
      console.error("analytics query returned error:", error);
      return emptyAnalytics();
    }

    return buildAnalytics((data ?? []) as AnalyticsDailyRow[]);
  } catch (error) {
    console.warn("Failed to fetch analytics, returning empty data:", error);
    return emptyAnalytics();
  }
}

export function useAnalytics(timeBucket: AnalyticsTimeBucket = "day") {
  return useQuery<AnalyticsData, Error>({
    queryKey: ["analytics", timeBucket],
    queryFn: () => fetchAnalytics(timeBucket),
    refetchInterval: 60000,
  });
}
