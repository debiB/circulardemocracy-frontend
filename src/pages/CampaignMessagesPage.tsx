import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, History } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CampaignReplyTemplatesDialog } from "@/components/dashboard/CampaignReplyTemplatesDialog";
import { MessageViewDialog } from "@/components/dashboard/MessageViewDialog";
import { PageLayout } from "@/components/PageLayout";
import { ReplyHistoryDialog } from "@/components/ReplyHistoryDialog";
import {
  getReplyStatus,
  ReplyStatusFilter,
  type ReplyStatusType,
} from "@/components/ReplyStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabase } from "@/lib/supabase";
import { formatFullDateTime, formatRelativeTime } from "@/lib/utils";

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
  // Note: sender_hash removed from interface as sender info is not displayed
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
    throw error; // Re-throw for error boundary
  }
}

async function fetchCampaignMessages(
  campaignId: string,
  filterLowConfidence?: boolean,
  page: number = 1,
  pageSize: number = 50,
): Promise<{ messages: Message[]; totalCount: number }> {
  try {
    // Pagination implemented using .range() for efficient data retrieval
    // Page size set to 50 as reasonable default
    // Returns both messages and total count for pagination UI

    const offset = (page - 1) * pageSize;

    // Single query returns both paginated rows and total count.
    let query = getSupabase()
      .from("messages")
      .select(
        "id, external_id, sender_country, duplicate_rank, classification_confidence, language, received_at, processed_at, reply_sent_at, reply_template_id, processing_status",
        { count: "exact" },
      )
      .eq("campaign_id", campaignId)
      .range(offset, offset + pageSize - 1)
      .order("received_at", { ascending: false });

    // Backend-driven filtering: Apply confidence filter if needed
    if (filterLowConfidence) {
      // TODO: Define threshold for "low confidence" - using 0.7 as placeholder
      query = query.lt("classification_confidence", 0.7);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }

    // Defensive check: ensure data is an array
    const messages = data && Array.isArray(data) ? data : [];

    return {
      messages,
      totalCount: count ?? 0,
    };
  } catch (error) {
    console.error("Error in fetchCampaignMessages:", error);
    throw error; // Re-throw for error boundary
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
  const [viewedMessageIds, setViewedMessageIds] = useState<Set<string>>(new Set());

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
  // Export includes: Country, Received date, Confidence, Duplicate status, Language, Processing status, Reply sent date
  // Privacy-safe: No sender information included
  const handleExport = async () => {
    try {
      // Defensive: ensure messages and campaign exist
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        alert("No messages to export");
        return;
      }

      if (!campaign?.name) {
        alert("Campaign information not available");
        return;
      }

      // Fetch all messages for export (no pagination)
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

      // Create CSV content
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

      // Create and download CSV file
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
    window.history.pushState(null, "", `/message/${encodeURIComponent(jmapId)}`);
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
            <div className="text-sm text-gray-500 mt-2">
              Status: <span className="font-medium">{campaign.status}</span> |
              Total Messages: <span className="font-medium">{totalCount}</span>
            </div>

            <div className="mt-4">
              <ReplyStatusFilter
                value={replyStatusFilter}
                onChange={setReplyStatusFilter}
              />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                  messages
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {messages && messages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Received</th>
                      <th className="py-2 px-4 border-b text-left">
                        Confidence
                      </th>
                      <th className="py-2 px-4 border-b text-left">
                        Duplicate
                      </th>
                      <th className="py-2 px-4 border-b text-left">Status</th>
                      <th className="py-2 px-4 border-b text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td
                          className="py-2 px-4 border-b cursor-help"
                          title={formatFullDateTime(message.received_at)}
                        >
                          {formatRelativeTime(message.received_at)}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <span
                            className={`px-2 py-1 rounded text-xs ${message.classification_confidence >= 0.7
                                ? "bg-green-100 text-green-800"
                                : message.classification_confidence >= 0.4
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                          >
                            {(message.classification_confidence * 100).toFixed(
                              0,
                            )}
                            %
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b">
                          {message.duplicate_rank === 0 ? (
                            <span className="text-green-600 font-medium">
                              Original
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              Dup #{message.duplicate_rank}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <span
                            className={`px-2 py-1 rounded text-xs ${message.processing_status === "unanswered"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {message.processing_status}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleViewMessage(
                                  message.id,
                                  message.external_id || "",
                                )
                              }
                              className="text-xs"
                              title={
                                message.external_id || "View message content"
                              }
                            >
                              <Eye
                                className={`h-3 w-3 ${
                                  message.external_id &&
                                  viewedMessageIds.has(message.external_id)
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </Button>
                            {(message.reply_template_id ||
                              message.reply_sent_at) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReplyHistoryMessage(message)}
                                  className="text-xs"
                                  title="View reply history"
                                >
                                  <History className="h-3 w-3" />
                                </Button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">
                No messages found for this campaign.
              </p>
            )}
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
