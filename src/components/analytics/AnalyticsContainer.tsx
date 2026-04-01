import { useState, useMemo, useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { MessageLineChart, type MessageLineChartData } from "@/components/charts/MessageLineChart";
import { CampaignFilter } from "@/components/filters/CampaignFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsContainer() {
  const { data, isLoading, isError, error } = useAnalytics();

  const campaigns = useMemo(() => {
    if (!data?.messagesByCampaign) return [];
    return data.messagesByCampaign.map(c => c.campaignName);
  }, [data]);

  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());

  // Update selected campaigns when campaigns data changes
  useEffect(() => {
    if (campaigns.length > 0) {
      setSelectedCampaigns(new Set(campaigns));
    }
  }, [campaigns]);

  const chartData = useMemo<MessageLineChartData[]>(() => {
    if (!data?.dailyCampaignData) return [];

    // Use actual daily campaign data aggregated from hourly backend data
    return data.dailyCampaignData.map(dayData => {
      const campaignCounts: { [campaignName: string]: number } = {};

      // Filter to only include selected campaigns
      Object.entries(dayData.campaigns).forEach(([campaignName, count]) => {
        if (selectedCampaigns.has(campaignName)) {
          campaignCounts[campaignName] = count;
        }
      });

      return {
        date: dayData.date,
        campaigns: campaignCounts,
      };
    });
  }, [data, selectedCampaigns]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-red-500 text-center">
              Failed to load analytics data
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {error?.message || "An unexpected error occurred"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">
              No analytics data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-primary">Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Messages</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.totalMessages}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Replies Sent</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.repliesSent}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Replies</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {data.pendingReplies}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <CampaignFilter
              campaigns={campaigns}
              selectedCampaigns={selectedCampaigns}
              onChange={setSelectedCampaigns}
            />
          </div>
          <div className="lg:col-span-3">
            {chartData.length > 0 ? (
              <MessageLineChart data={chartData} height={400} />
            ) : (
              <div className="flex items-center justify-center h-96 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">
                  No campaign data to display
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
