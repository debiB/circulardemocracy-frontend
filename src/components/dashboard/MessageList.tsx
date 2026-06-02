import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Forward,
  History,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ReplyStatusFilter,
  type ReplyStatusType,
} from "@/components/ReplyStatus";
import { formatFullDateTime, formatRelativeTime } from "@/lib/utils";

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

interface MessageListProps {
  messages: Message[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewMessage: (messageId: number, jmapId: string) => void;
  onViewHistory: (message: Message) => void;
  onViewReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onClassify?: (message: Message) => void;
  viewedMessageIds: Set<string>;
  replyStatusFilter: ReplyStatusType | "all";
  onReplyStatusFilterChange: (filter: ReplyStatusType | "all") => void;
  emptyMessage?: string;
  title?: string;
  showReplyFilter?: boolean;
}

export function MessageList({
  messages,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onViewMessage,
  onViewHistory,
  onViewReply,
  onForward,
  onClassify,
  viewedMessageIds,
  replyStatusFilter,
  onReplyStatusFilterChange,
  emptyMessage = "No messages found.",
  title,
  showReplyFilter = true,
}: MessageListProps) {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-semibold text-primary">{title}</h2>}

      {/* Reply status filter */}
      {showReplyFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reply status:</span>
          <ReplyStatusFilter
            value={replyStatusFilter}
            onChange={onReplyStatusFilterChange}
          />
        </div>
      )}

      {messages.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-4 border-b text-left">Received</th>
                <th className="py-2 px-4 border-b text-left">Confidence</th>
                <th className="py-2 px-4 border-b text-left">Duplicate</th>
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
                      {(message.classification_confidence * 100).toFixed(0)}%
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
                    {onViewReply &&
                      message.reply_id &&
                      message.processing_status === "replied" ? (
                      <button
                        type="button"
                        className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 ${"bg-green-100 text-green-800"}`}
                        title="View reply message"
                        onClick={() => onViewReply(message)}
                      >
                        {message.processing_status}
                      </button>
                    ) : (
                      <span
                        className={`px-2 py-1 rounded text-xs ${message.processing_status === "unanswered"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {message.processing_status}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onViewMessage(message.id, message.external_id || "")
                        }
                        className="text-xs"
                        title={message.external_id || "View message content"}
                      >
                        <Eye
                          className={`h-3 w-3 ${message.external_id &&
                              viewedMessageIds.has(message.external_id)
                              ? "text-primary"
                              : "text-muted-foreground"
                            }`}
                        />
                      </Button>
                      {(message.reply_template_id || message.reply_sent_at) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewHistory(message)}
                          className="text-xs"
                          title="View reply history"
                        >
                          <History className="h-3 w-3" />
                        </Button>
                      )}
                      {onClassify && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onClassify(message)}
                          className="text-xs"
                          title="Classify to campaign"
                        >
                          <Tag className="h-3 w-3" />
                        </Button>
                      )}
                      {onForward && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onForward(message)}
                          className="text-xs"
                          title="Forward to politician"
                        >
                          <Forward className="h-3 w-3" />
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
        <p className="text-gray-500">{emptyMessage}</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
