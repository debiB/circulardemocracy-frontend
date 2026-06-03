import { useSuspenseQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Campaign {
  id: number;
  name: string;
  created_at: string;
  updated_at: string; // Assuming 'updated_at' for modified_at
  // Add other campaign properties as needed
}

export interface CampaignWithExtras extends Campaign {
  hasReplyTemplate: boolean;
  templateId?: number;
  replyTemplateCount: number;
  activeReplyTemplateCount: number;
  messageCount: number;
}

export async function fetchCampaignsWithExtras(): Promise<
  CampaignWithExtras[]
> {
  try {
    const { data, error } = await supabase!
      .from("campaign_with_extra")
      .select(
        "id, name, created_at, updated_at, has_reply_template, template_id, reply_template_count, active_reply_template_count, message_count",
      )
      .gt("message_count", 0)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((campaign: any) => ({
      id: campaign.id,
      name: campaign.name,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      hasReplyTemplate: Boolean(campaign.has_reply_template),
      templateId: campaign.template_id ?? undefined,
      replyTemplateCount: Number(campaign.reply_template_count) || 0,
      activeReplyTemplateCount:
        Number(campaign.active_reply_template_count) || 0,
      messageCount: campaign.message_count ?? 0,
    }));
  } catch (error) {
    console.error("Error fetching campaigns with extras:", error);
    throw error; // Re-throw for error boundary to catch
  }
}
export function invalidateCampaignCache(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ["campaigns-with-extras"],
  });
}

export function useCampaignsWithExtras() {
  const { data: campaigns, ...rest } = useSuspenseQuery<
    CampaignWithExtras[],
    Error
  >({
    queryKey: ["campaigns-with-extras"],
    queryFn: fetchCampaignsWithExtras,
  });

  return { campaigns, ...rest };
}
