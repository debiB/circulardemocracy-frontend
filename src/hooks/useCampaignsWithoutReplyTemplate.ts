import { useSuspenseQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";

export interface CampaignWithoutReplyTemplate {
	campaignId: number;
	name: string;
}

async function fetchCampaignsWithoutReplyTemplate(): Promise<
	CampaignWithoutReplyTemplate[]
> {
	const {
		data: { session },
	} = await getSupabase().auth.getSession();

	if (!session) {
		throw new Error("Not authenticated");
	}

	const { data, error } = await getSupabase()
		.from("campaign_with_extra")
		.select("id, name")
		.eq("has_reply_template", false)
		.order("name", { ascending: true });

	if (error) {
		throw error;
	}

	return (data ?? []).map((row: { id: number; name: string }) => ({
		campaignId: row.id,
		name: row.name,
	}));
}

export function useCampaignsWithoutReplyTemplate() {
	return useSuspenseQuery<CampaignWithoutReplyTemplate[], Error>({
		queryKey: ["campaigns-without-reply-template"],
		queryFn: fetchCampaignsWithoutReplyTemplate,
		refetchInterval: 60000,
	});
}
