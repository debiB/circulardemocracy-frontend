import { useMemo } from "react";
import {
	MessageLineChart,
	type MessageLineChartData,
} from "@/components/charts/MessageLineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseAnalytics } from "@/hooks/useAnalytics";

export function AnalyticsContainer() {
	const { data } = useSuspenseAnalytics();

	const chartData = useMemo<MessageLineChartData[]>(() => {
		if (!data?.chartCampaignData) return [];

		return data.chartCampaignData.map((bucket) => ({
			date: bucket.date,
			campaigns: bucket.campaigns,
		}));
	}, [data]);

	return (
		<Card className="p-4">
			<CardHeader>
				<CardTitle className="text-primary">Messages by week</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Total Messages
						</p>
						<p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
							{data.totalMessages}
						</p>
					</div>
					<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Replies Sent
						</p>
						<p className="text-2xl font-bold text-green-600 dark:text-green-400">
							{data.repliesSent}
						</p>
					</div>
					<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Pending Replies
						</p>
						<p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
							{data.pendingReplies}
						</p>
					</div>
				</div>

				<div>
					{chartData.length > 0 ? (
						<MessageLineChart data={chartData} height={400} timeBucket="week" />
					) : (
						<div className="flex items-center justify-center h-96 border border-gray-200 dark:border-gray-700 rounded-lg">
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
