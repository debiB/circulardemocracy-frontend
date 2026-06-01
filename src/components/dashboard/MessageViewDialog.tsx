import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { JmapMessage } from "jmap-cli";

interface MessageViewDialogProps {
  messageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageViewDialog({
  messageId,
  open,
  onOpenChange,
}: MessageViewDialogProps) {
  const { jmapClient } = useAuth();
  const [viewedMessage, setViewedMessage] = useState<JmapMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !messageId || !jmapClient) return;

    setLoading(true);
    setError(null);
    setViewedMessage(null);

    jmapClient
      .getMessage({ messageId })
      .then((message) => {
        setViewedMessage(message);
      })
      .catch((err: Error) => {
        console.error("Failed to fetch message via JMAP:", err);
        setError(err.message || "Failed to load message");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, messageId, jmapClient]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader className="flex flex-row items-start justify-between gap-2">
          <AlertDialogTitle className="text-lg">
            {loading
              ? "Loading message..."
              : error
                ? "Failed to load message"
                : viewedMessage?.subject || "Message"}
          </AlertDialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 py-4">{error}</p>
        ) : viewedMessage ? (
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <span className="font-medium text-muted-foreground">
                {viewedMessage.replyTo && viewedMessage.replyTo.length > 0
                  ? "Reply-To:"
                  : "From:"}
              </span>
              <span>
                {(
                  viewedMessage.replyTo && viewedMessage.replyTo.length > 0
                    ? viewedMessage.replyTo
                    : viewedMessage.from
                )
                  ?.map((a) =>
                    a.name ? `${a.name} <${a.email}>` : a.email,
                  )
                  .join(", ") || "Unknown"}
              </span>
              <span className="font-medium text-muted-foreground">To:</span>
              <span>
                {viewedMessage.to
                  ?.map((a) => a.name || a.email)
                  .join(", ") || "Unknown"}
              </span>
              {viewedMessage.receivedAt && (
                <>
                  <span className="font-medium text-muted-foreground">
                    Date:
                  </span>
                  <span>
                    {new Date(viewedMessage.receivedAt).toLocaleString()}
                  </span>
                </>
              )}
            </div>

            <hr />

            <div className="text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
              {viewedMessage.body ||
                (typeof viewedMessage.textBody === "string"
                  ? viewedMessage.textBody
                  : Array.isArray(viewedMessage.textBody)
                    ? viewedMessage.textBody
                        .map((p) =>
                          typeof p === "string" ? p : p.partId,
                        )
                        .join("\n")
                    : "(no text content)")}
            </div>
          </div>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
