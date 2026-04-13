import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

interface AnalyticsItem {
  date: string;
  campaign_id: number;
  campaign_name: string;
  message_count: number;
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const {
    data: { session },
  } = await supabase!.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    //const { data: analytics, error } = await supabase!
    //  .rpc('get_message_analytics_daily', { days_back: 7 });

    const { data: analytics, error } = await supabase!
      .from("daily_message_analytics")
      .select("*");

    console.log(analytics);

    if (error) {
      console.error("analytics returned error:", error);
      return {
        totalMessages: 0,
        repliesSent: 0,
        pendingReplies: 0,
        messagesByDay: [],
        messagesByCampaign: [],
        dailyCampaignData: [],
      };
    }

    if (!analytics || analytics.length === 0) {
      return {
        totalMessages: 0,
        repliesSent: 0,
        pendingReplies: 0,
        messagesByDay: [],
        messagesByCampaign: [],
        dailyCampaignData: [],
      };
    }

    // Group data by date and campaign
    const dailyByCampaignMap = new Map<string, Map<string, number>>();
    const campaignMap = new Map<number, { name: string; count: number }>();
    let totalMessages = 0;

    analytics.forEach((item: AnalyticsItem) => {
      const date = item.date;
      const campaignName = item.campaign_name;

      // Build daily campaign breakdown
      if (!dailyByCampaignMap.has(date)) {
        dailyByCampaignMap.set(date, new Map());
      }
      const dayMap = dailyByCampaignMap.get(date)!;
      dayMap.set(campaignName, item.message_count);

      // Aggregate campaign totals
      const existing = campaignMap.get(item.campaign_id);
      if (existing) {
        existing.count += item.message_count;
      } else {
        campaignMap.set(item.campaign_id, {
          name: item.campaign_name,
          count: item.message_count,
        });
      }

      totalMessages += item.message_count;
    });

    // Convert to array format for messagesByDay
    const messagesByDay = Array.from(dailyByCampaignMap.entries())
      .map(([date, campaigns]) => {
        const totalForDay = Array.from(campaigns.values()).reduce(
          (sum, count) => sum + count,
          0,
        );
        return { date, count: totalForDay };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const messagesByCampaign = Array.from(campaignMap.entries())
      .map(([campaignId, { name, count }]) => ({
        campaignId,
        campaignName: name,
        count,
      }))
      .sort((a, b) => a.campaignId - b.campaignId);

    // Store daily campaign breakdown for chart use
    const dailyCampaignData = Array.from(dailyByCampaignMap.entries())
      .map(([date, campaigns]) => ({
        date,
        campaigns: Object.fromEntries(campaigns),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalMessages,
      repliesSent: 0,
      pendingReplies: totalMessages,
      messagesByDay,
      messagesByCampaign,
      dailyCampaignData,
    };
  } catch (error) {
    console.warn("Failed to fetch analytics, returning empty data:", error);
    return {
      totalMessages: 0,
      repliesSent: 0,
      pendingReplies: 0,
      messagesByDay: [],
      messagesByCampaign: [],
      dailyCampaignData: [],
    };
  }
}

export function useAnalytics() {
  return useQuery<AnalyticsData, Error>({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 60000,
  });
}
