import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CampaignReplyTemplatesDialog } from "@/components/dashboard/CampaignReplyTemplatesDialog";
import { MessageList } from "@/components/dashboard/MessageList";
import { MessageViewDialog } from "@/components/dashboard/MessageViewDialog";
import { PageLayout } from "@/components/PageLayout";
import { ReplyHistoryDialog } from "@/components/ReplyHistoryDialog";
import {
  getReplyStatus,
  type ReplyStatusType,
} from "@/components/ReplyStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabase } from "@/lib/supabase";

interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  hasReplyTemplate: boolean;
  replyTemplateCount: number;
  activeReplyTemplateCount: number;
}

interface Message {
  id: number;
  external_id: string | null;
  sender_country: string | null;
  duplicate_rank: number;
  classification_confidence: number;
  language: string;
  received_at: string;
  processed_at: string;
  reply_sent_at: string | null;
  reply_template_id: number | null;
  processing_status: string;
}

async function fetchCampaign(campaignId: string): Promise<Campaign> {
  try {
    const { data, error } = await getSupabase()
      .from("campaign_with_extra")
      .select(
        "id, name, slug, description, status, has_reply_template, reply_template_count, active_reply_template_count",
      )
      .eq("id", campaignId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Campaign not found");
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      status: data.status,
      hasReplyTemplate: Boolean(data.has_reply_template),
      replyTemplateCount: Number(data.reply_template_count) || 0,
      activeReplyTemplateCount: Number(data.active_reply_template_count) || 0,
    };
  } catch (error) {
    console.error("Error fetching campaign:", error);
    throw error;
  }
}

async function fetchCampaignMessages(
  campaignId: string,
  filterLowConfidence?: boolean,
  page: number = 1,
  pageSize: number = 50,
): Promise<{ messages: Message[]; totalCount: number }> {
  try {
    const offset = (page - 1) * pageSize;

    let query = getSupabase()
      .from("messages")
      .select(
        "id, external_id, sender_country, duplicate_rank, classification_confidence, language, received_at, processed_at, reply_sent_at, reply_template_id, processing_status",
        { count: "exact" },
      )
      .eq("campaign_id", campaignId)
      .range(offset, offset + pageSize - 1)
      .order("received_at", { ascending: false });

    if (filterLowConfidence) {
      query = query.lt("classification_confidence", 0.7);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }

    const messages = data && Array.isArray(data) ? data : [];

    return {
      messages,
      totalCount: count ?? 0,
    };
  } catch (error) {
    console.error("Error in fetchCampaignMessages:", error);
    throw error;
  }
}

export function CampaignMessagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: campaign } = useSuspenseQuery<Campaign, Error>({
    queryKey: ["campaign", id!],
    queryFn: () => fetchCampaign(id!),
  });

  const filterLowConfidence = false;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Reply status filter
  const [replyStatusFilter, setReplyStatusFilter] = useState<
    ReplyStatusType | "all"
  >("all");

  // Reply history dialog
  const [replyHistoryMessage, setReplyHistoryMessage] =
    useState<Message | null>(null);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(
    searchParams.get("create") === "true",
  );
  const [messageDialogId, setMessageDialogId] = useState<string | null>(null);
  const [viewedMessageIds, setViewedMessageIds] = useState<Set<string>>(
    new Set(),
  );

  const { data: messagesData } = useSuspenseQuery<
    { messages: Message[]; totalCount: number },
    Error
  >({
    queryKey: ["campaign-messages", id!, filterLowConfidence, currentPage],
    queryFn: () =>
      fetchCampaignMessages(id!, filterLowConfidence, currentPage, pageSize),
  });

  const allMessages = messagesData?.messages || [];

  // Filter messages by reply status
  const messages =
    replyStatusFilter === "all"
      ? allMessages
      : allMessages.filter(
          (msg) =>
            getReplyStatus(msg.reply_sent_at, msg.reply_template_id) ===
            replyStatusFilter,
        );

  const totalCount = messagesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // CSV Export functionality
  const handleExport = async () => {
    try {
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        alert("No messages to export");
        return;
      }

      if (!campaign?.name) {
        alert("Campaign information not available");
        return;
      }

      const allMessagesData = await fetchCampaignMessages(
        id as string,
        filterLowConfidence,
        1,
        10000,
      );
      const allMessages = allMessagesData.messages;

      if (allMessages.length === 0) {
        alert("No messages to export");
        return;
      }

      const headers = [
        "ID",
        "External ID",
        "Country",
        "Confidence",
        "Duplicate Rank",
        "Language",
        "Status",
        "Reply Sent At",
      ];
      const csvContent = [
        headers.join(","),
        ...allMessages
          .filter((m) => m != null)
          .map((message) =>
            [
              message.id ?? "",
              message.external_id || "",
              message.sender_country || "Unknown",
              message.classification_confidence != null
                ? `${(message.classification_confidence * 100).toFixed(1)}%`
                : "N/A",
              message.duplicate_rank === 0
                ? "Original"
                : `Dup #${message.duplicate_rank ?? "N/A"}`,
              message.language || "Unknown",
              message.processing_status || "Unknown",
              message.reply_sent_at || "",
            ]
              .map((field) => `"${field}"`)
              .join(","),
          ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${campaign.name.replace(/[^a-z0-9]/gi, "_")}_messages.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  // Open message dialog and push URL for shareability
  const handleViewMessage = (_messageId: number, jmapId: string) => {
    if (!jmapId) return;
    window.history.pushState(
      null,
      "",
      `/message/${encodeURIComponent(jmapId)}`,
    );
    setMessageDialogId(jmapId);
    setViewedMessageIds((prev) => new Set(prev).add(jmapId));
  };

  // Close dialog when browser back/forward navigates away from message URL
  useEffect(() => {
    const handlePopState = () => {
      if (messageDialogId) {
        setMessageDialogId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [messageDialogId]);

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/campaigns")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplatesDialogOpen(true)}
              className={
                campaign.hasReplyTemplate
                  ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-200"
                  : "text-black-500 hover:bg-gray-100"
              }
            >
              {campaign.hasReplyTemplate
                ? campaign.replyTemplateCount > 1
                  ? `${campaign.replyTemplateCount} templates (${campaign.activeReplyTemplateCount} active)`
                  : "Update Template"
                : "Create Template"}
            </Button>
            <Button onClick={handleExport} variant="outline">
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-primary">
              {campaign.name} - Messages
            </CardTitle>
            {campaign.description && (
              <p className="text-sm text-gray-600 mt-2">
                {campaign.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <MessageList
              messages={messages}
              totalCount={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onViewMessage={handleViewMessage}
              onViewHistory={setReplyHistoryMessage}
              viewedMessageIds={viewedMessageIds}
              replyStatusFilter={replyStatusFilter}
              onReplyStatusFilterChange={setReplyStatusFilter}
              emptyMessage="No messages found for this campaign."
            />
          </CardContent>
        </Card>

        <CampaignReplyTemplatesDialog
          open={templatesDialogOpen}
          onOpenChange={setTemplatesDialogOpen}
          campaignId={campaign.id}
          campaignName={campaign.name}
          defaultShowAddForm={searchParams.get("create") === "true"}
        />

        {/* Reply History Dialog */}
        {replyHistoryMessage && (
          <ReplyHistoryDialog
            message={replyHistoryMessage}
            open={!!replyHistoryMessage}
            onOpenChange={(open) => !open && setReplyHistoryMessage(null)}
          />
        )}

        {/* Message View Dialog */}
        <MessageViewDialog
          messageId={messageDialogId || ""}
          open={!!messageDialogId}
          onOpenChange={(open) => {
            if (!open) {
              setMessageDialogId(null);
              if (window.location.pathname.startsWith("/message/")) {
                window.history.back();
              }
            }
          }}
        />
      </div>
    </PageLayout>
  );
}
