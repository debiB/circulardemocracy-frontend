import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { ClassifyDialog } from "@/components/dashboard/ClassifyDialog";
import { MessageList } from "@/components/dashboard/MessageList";
import { MessageViewDialog } from "@/components/dashboard/MessageViewDialog";
import { PageLayout } from "@/components/PageLayout";
import { ReplyHistoryDialog } from "@/components/ReplyHistoryDialog";
import { getReplyStatus, type ReplyStatusType } from "@/components/ReplyStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabase } from "@/lib/supabase";

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
  reply_id: string | null;
}

async function fetchUnclassifiedMessages(
  page: number = 1,
  pageSize: number = 50,
): Promise<{ messages: Message[]; totalCount: number }> {
  try {
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await getSupabase()
      .from("messages")
      .select(
        "id, external_id, sender_country, duplicate_rank, classification_confidence, language, received_at, processed_at, reply_sent_at, reply_template_id, processing_status, reply_id",
        { count: "exact" },
      )
      .is("campaign_id", null)
      .range(offset, offset + pageSize - 1)
      .order("received_at", { ascending: false });

    if (error) {
      console.error("Error fetching unclassified messages:", error);
      throw error;
    }

    const messages = data && Array.isArray(data) ? data : [];

    return {
      messages,
      totalCount: count ?? 0,
    };
  } catch (error) {
    console.error("Error in fetchUnclassifiedMessages:", error);
    throw error;
  }
}

export function UnclassifiedPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Reply status filter
  const [replyStatusFilter, setReplyStatusFilter] = useState<
    ReplyStatusType | "all"
  >("all");

  // Reply history dialog
  const [replyHistoryMessage, setReplyHistoryMessage] =
    useState<Message | null>(null);
  const [messageDialogMsg, setMessageDialogMsg] = useState<Message | null>(null);
  const [viewedMessageIds, setViewedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [classifyingMessage, setClassifyingMessage] =
    useState<Message | null>(null);

  const { data: messagesData } = useSuspenseQuery<
    { messages: Message[]; totalCount: number },
    Error
  >({
    queryKey: ["unclassified-messages", currentPage],
    queryFn: () => fetchUnclassifiedMessages(currentPage, pageSize),
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

  // Open message dialog and push URL for shareability
  const handleViewMessage = (_messageId: number, jmapId: string) => {
    if (!jmapId) return;
    window.history.pushState(
      null,
      "",
      `/message/${encodeURIComponent(jmapId)}`,
    );
    const msg = allMessages.find((m) => m.external_id === jmapId) ?? null;
    setMessageDialogMsg(msg);
    setViewedMessageIds((prev) => new Set(prev).add(jmapId));
  };

  // Open the reply message dialog
  const handleViewReply = (message: Message) => {
    if (!message.reply_id) return;
    window.history.pushState(
      null,
      "",
      `/message/${encodeURIComponent(message.reply_id)}`,
    );
    setMessageDialogMsg({
      ...message,
      external_id: message.reply_id,
    });
    setViewedMessageIds((prev) => new Set(prev).add(message.reply_id!));
  };

  // Close dialog when browser back/forward navigates away from message URL
  useEffect(() => {
    const handlePopState = () => {
      if (messageDialogMsg) {
        setMessageDialogMsg(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [messageDialogMsg]);

  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Unclassified</h1>
        <p className="text-gray-600">
          The AI engine couldn't confidently identify the campaign for these
          messages. Manually assign each to a campaign to enable sending a
          reply.
        </p>

        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-primary">Messages</CardTitle>
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
              onViewReply={handleViewReply}
              onClassify={setClassifyingMessage}
              viewedMessageIds={viewedMessageIds}
              replyStatusFilter={replyStatusFilter}
              onReplyStatusFilterChange={setReplyStatusFilter}
              emptyMessage="No unclassified messages found."
              showReplyFilter={false}
            />
          </CardContent>
        </Card>

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
          messageId={messageDialogMsg?.external_id || ""}
          open={!!messageDialogMsg}
          replySentAt={messageDialogMsg?.reply_sent_at ?? null}
          replyTemplateId={messageDialogMsg?.reply_template_id ?? null}

          onOpenChange={(open) => {
            if (!open) {
              setMessageDialogMsg(null);
              if (window.location.pathname.startsWith("/message/")) {
                window.history.back();
              }
            }
          }}
        />

        {/* Classify Dialog */}
        <Suspense fallback={null}>
          <ClassifyDialog
            message={classifyingMessage}
            open={!!classifyingMessage}
            onOpenChange={(open) => {
              if (!open) setClassifyingMessage(null);
            }}
            onClassified={() => {
              queryClient.invalidateQueries({
                queryKey: ["unclassified-messages"],
              });
            }}
          />
        </Suspense>
      </div>
    </PageLayout>
  );
}
