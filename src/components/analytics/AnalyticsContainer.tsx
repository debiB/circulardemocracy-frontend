import { useMemo } from "react";
import {
	MessageLineChart,
	type MessageLineChartData,
} from "@/components/charts/MessageLineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/useAnalytics";

export function AnalyticsContainer() {
	const { data, isLoading, isError, error } = useAnalytics();

	const chartData = useMemo<MessageLineChartData[]>(() => {
		if (!data?.dailyCampaignData) return [];

		return data.dailyCampaignData.map((dayData) => ({
			date: dayData.date,
			campaigns: dayData.campaigns,
		}));
	}, [data]);

	if (isLoading) {
		return (
			<Card className="p-4">
				<CardHeader>
					<CardTitle className="text-primary">
						What happened this week
					</CardTitle>
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
					<CardTitle className="text-primary">
						What happened this week
					</CardTitle>
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
						<MessageLineChart data={chartData} height={400} />
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
