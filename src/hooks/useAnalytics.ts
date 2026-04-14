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

const EMPTY_ANALYTICS: AnalyticsData = {
  totalMessages: 0,
  repliesSent: 0,
  pendingReplies: 0,
  messagesByDay: [],
  messagesByCampaign: [],
  dailyCampaignData: [],
};

async function fetchAnalytics(): Promise<AnalyticsData> {
  const { data: { session } } = await supabase!.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  try {
    const { data, error } = await supabase!
      .rpc('get_message_analytics_summary', { days_back: 7 });

    if (error) {
      console.warn('Analytics RPC returned error:', error);
      return EMPTY_ANALYTICS;
    }

    if (!data || typeof data !== 'object') {
      return EMPTY_ANALYTICS;
    }

    return data as AnalyticsData;
  } catch (error) {
    console.warn('Failed to fetch analytics, returning empty data:', error);
    return EMPTY_ANALYTICS;
  }
}

export function useAnalytics() {
  return useQuery<AnalyticsData, Error>({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 60000,
  });
}
