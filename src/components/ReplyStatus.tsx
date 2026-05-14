import { CheckCircle, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export type ReplyStatusType = "pending" | "scheduled" | "sent" | "none";

interface ReplyStatusProps {
  replySentAt: string | null;
  replyTemplateId: number | null;
  variant?: "badge" | "detailed";
}

export function getReplyStatus(
  replySentAt: string | null,
  replyTemplateId: number | null,
): ReplyStatusType {
  if (replySentAt) {
    return "sent";
  }

  if (replyTemplateId) {
    // Template assigned but not sent yet
    // TODO: Check if template has scheduled timing to distinguish 'scheduled' from 'pending'
    // For now, we assume 'pending' if template is assigned but not sent
    return "pending";
  }

  return "none";
}

export function ReplyStatus({
  replySentAt,
  replyTemplateId,
  variant = "badge",
}: ReplyStatusProps) {
  const status = getReplyStatus(replySentAt, replyTemplateId);

  if (variant === "badge") {
    return <ReplyStatusBadge status={status} />;
  }

  return (
    <ReplyStatusDetailed
      status={status}
      replySentAt={replySentAt}
      replyTemplateId={replyTemplateId}
    />
  );
}

function ReplyStatusBadge({ status }: { status: ReplyStatusType }) {
  switch (status) {
    case "sent":
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      );
    case "scheduled":
      return (
        <Badge
          variant="default"
          className="bg-blue-100 text-blue-800 border-blue-200"
        >
          <Clock className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="default"
          className="bg-yellow-100 text-yellow-800 border-yellow-200"
        >
          <Send className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-gray-500">
          No Reply
        </Badge>
      );
  }
}

function ReplyStatusDetailed({
  status,
  replySentAt,
  replyTemplateId,
}: {
  status: ReplyStatusType;
  replySentAt: string | null;
  replyTemplateId: number | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ReplyStatusBadge status={status} />
      </div>

      {status === "sent" && replySentAt && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Sent:</span> {formatDate(replySentAt)}
        </div>
      )}

      {replyTemplateId && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Template ID:</span> {replyTemplateId}
          {/* TODO: Fetch and display template name instead of just ID */}
          {/* TODO: Add link to view template details */}
        </div>
      )}

      {status === "pending" && (
        <div className="text-xs text-gray-500">
          Template assigned, awaiting send
        </div>
      )}

      {status === "scheduled" && (
        <div className="text-xs text-gray-500">
          {/* TODO: Display scheduled send time from template */}
          Scheduled for future delivery
        </div>
      )}
    </div>
  );
}

export function ReplyStatusFilter({
  value,
  onChange,
}: {
  value: ReplyStatusType | "all";
  onChange: (value: ReplyStatusType | "all") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">
        Filter by reply status:
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange("all")}
          className={`px-3 py-1 text-xs rounded ${
            value === "all"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onChange("sent")}
          className={`px-3 py-1 text-xs rounded ${
            value === "sent"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Sent
        </button>
        <button
          type="button"
          onClick={() => onChange("pending")}
          className={`px-3 py-1 text-xs rounded ${
            value === "pending"
              ? "bg-yellow-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => onChange("none")}
          className={`px-3 py-1 text-xs rounded ${
            value === "none"
              ? "bg-gray-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          No Reply
        </button>
      </div>
    </div>
  );
}
