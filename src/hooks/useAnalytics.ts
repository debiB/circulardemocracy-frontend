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

async function fetchAnalytics(): Promise<AnalyticsData> {
  const {
    data: { session },
  } = await supabase!.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    const { data: summary, error } = await supabase!
      .rpc("get_message_analytics_summary", { days_back: 7 });

    if (error) {
      console.error("analytics summary returned error:", error);
      return {
        totalMessages: 0,
        repliesSent: 0,
        pendingReplies: 0,
        messagesByDay: [],
        messagesByCampaign: [],
        dailyCampaignData: [],
      };
    }

    if (!summary) {
      return {
        totalMessages: 0,
        repliesSent: 0,
        pendingReplies: 0,
        messagesByDay: [],
        messagesByCampaign: [],
        dailyCampaignData: [],
      };
    }

    return {
      totalMessages: summary.totalMessages ?? 0,
      repliesSent: summary.repliesSent ?? 0,
      pendingReplies: summary.pendingReplies ?? 0,
      messagesByDay: summary.messagesByDay ?? [],
      messagesByCampaign: summary.messagesByCampaign ?? [],
      dailyCampaignData: summary.dailyCampaignData ?? [],
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
