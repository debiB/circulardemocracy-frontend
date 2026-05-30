import { useMemo } from "react";
import {
  MessageLineChart,
  type MessageLineChartData,
} from "@/components/charts/MessageLineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AnalyticsTimeBucket,
  useAnalytics,
  useByStatus,
} from "@/hooks/useAnalytics";

interface AnalyticsContainerProps {
  timeBucket?: AnalyticsTimeBucket;
}

export function AnalyticsContainer({
  timeBucket = "day",
}: AnalyticsContainerProps) {
  const { data, isLoading: isAnalyticsLoading, isError, error } = useAnalytics(timeBucket);

  const startDate = useMemo(() => {
    if (timeBucket === "day") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    }
    return undefined;
  }, [timeBucket]);

  const { data: statusData, isLoading: isStatusLoading } = useByStatus(startDate);

  const chartTitle =
    timeBucket === "week" ? "Messages by week" : "What happened this week";

  const chartData = useMemo<MessageLineChartData[]>(() => {
    if (!data?.dailyCampaignData) return [];

    return data.dailyCampaignData.map((dayData) => ({
      date: dayData.date,
      campaigns: dayData.campaigns,
    }));
  }, [data]);

  const statusMetrics = useMemo(() => {
    if (!statusData) return { total: 0, replied: 0, unanswered: 0 };

    const total = statusData.reduce((sum, s) => sum + s.count, 0);
    const replied =
      statusData.find((s) => s.status === "replied" || s.status === "sent")
        ?.count || 0;
    const unanswered =
      statusData.find((s) => s.status === "unanswered" || s.status === "pending")
        ?.count || 0;

    return { total, replied, unanswered };
  }, [statusData]);

  if (isAnalyticsLoading || isStatusLoading) {
    return (
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">{chartTitle}</CardTitle>
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
          <CardTitle className="text-primary">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
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
        <CardTitle className="text-primary">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Messages</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {statusMetrics.total}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Replied</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {statusMetrics.replied}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unanswered
            </p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {statusMetrics.unanswered}
            </p>
          </div>
        </div>

        <div>
          {chartData.length > 0 ? (
            <MessageLineChart
              data={chartData}
              height={400}
              timeBucket={timeBucket}
            />
          ) : (
            <div className="flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                No campaign data to display
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
