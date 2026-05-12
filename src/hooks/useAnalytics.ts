import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";

interface AnalyticsData {
	totalMessages: number;
	repliesSent: number;
	pendingReplies: number;
	/** Counts per chart bucket (calendar week from `message_analytics_weekly_view`). */
	messagesByPeriod: Array<{
		date: string;
		count: number;
	}>;
	messagesByCampaign: Array<{
		campaignId: number;
		campaignName: string;
		count: number;
	}>;
	/** One entry per bucket for the line chart (campaign breakdown). */
	chartCampaignData?: Array<{
		date: string;
		campaigns: { [campaignName: string]: number };
	}>;
}

interface AnalyticsBucketRow {
	date: string;
	campaign_id: number | null;
	campaign_name: string | null;
	message_count: number;
}

const emptyAnalytics = (): AnalyticsData => ({
	totalMessages: 0,
	repliesSent: 0,
	pendingReplies: 0,
	messagesByPeriod: [],
	messagesByCampaign: [],
	chartCampaignData: [],
});

function buildAnalytics(rows: AnalyticsBucketRow[]): AnalyticsData {
	if (!rows.length) {
		return emptyAnalytics();
	}

	const bucketTotals = new Map<string, number>();
	const byCampaign = new Map<number, { campaignName: string; count: number }>();
	const bucketCampaigns = new Map<string, Record<string, number>>();

	for (const row of rows) {
		const count = Number(row.message_count || 0);
		const date = row.date.slice(0, 10);
		const campaignId = row.campaign_id;
		const campaignName = row.campaign_name ?? "Unknown";

		bucketTotals.set(date, (bucketTotals.get(date) ?? 0) + count);

		if (campaignId !== null) {
			const currentCampaign = byCampaign.get(campaignId);
			byCampaign.set(campaignId, {
				campaignName,
				count: (currentCampaign?.count ?? 0) + count,
			});
		}

		const campaignsForBucket = bucketCampaigns.get(date) ?? {};
		campaignsForBucket[campaignName] =
			(campaignsForBucket[campaignName] ?? 0) + count;
		bucketCampaigns.set(date, campaignsForBucket);
	}

	const messagesByPeriod = Array.from(bucketTotals.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, count]) => ({ date, count }));

	const messagesByCampaign = Array.from(byCampaign.entries())
		.sort(([a], [b]) => a - b)
		.map(([campaignId, { campaignName, count }]) => ({
			campaignId,
			campaignName,
			count,
		}));

	const chartCampaignData = Array.from(bucketCampaigns.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, campaigns]) => ({ date, campaigns }));

	const totalMessages = messagesByPeriod.reduce(
		(sum, row) => sum + row.count,
		0,
	);

	return {
		totalMessages,
		repliesSent: 0,
		pendingReplies: totalMessages,
		messagesByPeriod,
		messagesByCampaign,
		chartCampaignData,
	};
}

async function fetchAnalytics(): Promise<AnalyticsData> {
	const {
		data: { session },
	} = await getSupabase().auth.getSession();

	if (!session) {
		throw new Error("Not authenticated");
	}

	try {
		const { data, error } = await getSupabase()
			.from("message_analytics_weekly_view")
			.select("date, campaign_id, campaign_name, message_count")
			.order("date", { ascending: true });

		if (error) {
			console.error("analytics query returned error:", error);
			return emptyAnalytics();
		}

		return buildAnalytics((data ?? []) as AnalyticsBucketRow[]);
	} catch (error) {
		console.warn("Failed to fetch analytics, returning empty data:", error);
		return emptyAnalytics();
	}
}

export function useAnalytics() {
	return useQuery<AnalyticsData, Error>({
		queryKey: ["analytics"],
		queryFn: fetchAnalytics,
		refetchInterval: 60000,
	});
}

/** Same cache key as {@link useAnalytics}; use inside a React `Suspense` boundary. */
export function useSuspenseAnalytics() {
	return useSuspenseQuery<AnalyticsData, Error>({
		queryKey: ["analytics"],
		queryFn: fetchAnalytics,
		refetchInterval: 60000,
	});
}
