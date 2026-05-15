import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CampaignReplyTemplatesDialog } from "@/components/dashboard/CampaignReplyTemplatesDialog";
import { PageLayout } from "@/components/PageLayout"; // Import PageLayout
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils"; // Import the new utility

// A simple spinner component for fallback within the card
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

interface Campaign {
  id: number;
  name: string;
  created_at: string;
  updated_at: string; // Assuming 'updated_at' for modified_at
  // Add other campaign properties as needed
}

interface CampaignWithExtras extends Campaign {
  hasReplyTemplate: boolean;
  templateId?: number;
  replyTemplateCount: number;
  activeReplyTemplateCount: number;
  messageCount: number;
}

async function fetchCampaignsWithExtras(): Promise<CampaignWithExtras[]> {
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

export function CampaignsPage() {
  const navigate = useNavigate();
  const [templatesDialogCampaign, setTemplatesDialogCampaign] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { data: campaigns } = useSuspenseQuery<CampaignWithExtras[], Error>({
    queryKey: ["campaigns-with-extras"],
    queryFn: fetchCampaignsWithExtras,
  });

  return (
    <PageLayout>
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">Campaigns</CardTitle>{" "}
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingSpinner />}>
            {campaigns && Array.isArray(campaigns) && campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">ID</th>
                      <th className="py-2 px-4 border-b text-left">Name</th>
                      <th className="py-2 px-4 border-b text-left">
                        Created At
                      </th>
                      <th className="py-2 px-4 border-b text-left">
                        Updated At
                      </th>
                      <th className="py-2 px-4 border-b text-left">Messages</th>
                      <th className="py-2 px-4 border-b text-left">
                        Reply Template
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr
                        key={campaign.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td
                          className="py-2 px-4 border-b"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          {campaign.id}
                        </td>
                        <td
                          className="py-2 px-4 border-b font-medium"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          {campaign.name}
                        </td>
                        <td
                          className="py-2 px-4 border-b"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          {campaign.created_at
                            ? formatDate(campaign.created_at)
                            : "N/A"}
                        </td>
                        <td
                          className="py-2 px-4 border-b"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          {campaign.updated_at
                            ? formatDate(campaign.updated_at)
                            : "N/A"}
                        </td>
                        <td
                          className="py-2 px-4 border-b"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          <Badge variant="secondary" className="text-white">
                            {campaign.messageCount ?? 0}{" "}
                            {campaign.messageCount === 1
                              ? "message"
                              : "messages"}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 border-b">
                          {campaign.hasReplyTemplate ? (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTemplatesDialogCampaign({
                                  id: campaign.id,
                                  name: campaign.name,
                                });
                              }}
                            >
                              {campaign.replyTemplateCount > 1
                                ? `${campaign.replyTemplateCount} templates (${campaign.activeReplyTemplateCount} active)`
                                : "Template Exists"}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTemplatesDialogCampaign({
                                  id: campaign.id,
                                  name: campaign.name,
                                });
                              }}
                            >
                              No Template
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No campaigns found.
              </p>
            )}
          </Suspense>
        </CardContent>
      </Card>

      <CampaignReplyTemplatesDialog
        open={templatesDialogCampaign !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTemplatesDialogCampaign(null);
          }
        }}
        campaignId={templatesDialogCampaign?.id ?? null}
        campaignName={templatesDialogCampaign?.name ?? ""}
      />
    </PageLayout>
  );
}
