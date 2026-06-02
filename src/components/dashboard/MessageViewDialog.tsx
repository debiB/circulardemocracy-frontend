import { useMutation } from "@tanstack/react-query";
import { Loader2, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import type { JmapMessage } from "jmap-cli";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

interface MessageViewDialogProps {
  messageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replySentAt?: string | null;
  replyTemplateId?: number | null;
  campaignId?: number | null;
}

function MessageContent({
  viewedMessage,
  replySentAt,
  replyTemplateId,
  campaignId,
  jmapClient,
}: {
  viewedMessage: JmapMessage;
  replySentAt?: string | null;
  replyTemplateId?: number | null;
  campaignId?: number | null;
  jmapClient: NonNullable<ReturnType<typeof useAuth>["jmapClient"]>;
}) {
  const sendAgainMutation = useMutation({
    mutationFn: async () => {
      if (!jmapClient) {
        throw new Error("JMAP client not available");
      }

      let templateSubject: string;
      let templateBody: string;

      if (replyTemplateId) {
        const { data: template, error: templateError } = await getSupabase()
          .from("reply_templates")
          .select("subject, body")
          .eq("id", replyTemplateId)
          .single();

        if (templateError || !template) {
          throw new Error("Failed to fetch reply template");
        }
        templateSubject = template.subject;
        templateBody = template.body;
      } else if (campaignId) {
        const { data: template, error: templateError } = await getSupabase()
          .from("reply_templates")
          .select("subject, body")
          .eq("campaign_id", campaignId)
          .eq("active", true)
          .limit(1)
          .single();

        if (templateError || !template) {
          throw new Error("No active template found for this campaign");
        }
        templateSubject = template.subject;
        templateBody = template.body;
      } else {
        throw new Error("No reply template available for this message");
      }

      const constituent = viewedMessage.replyTo?.[0] ?? viewedMessage.from?.[0];
      if (!constituent?.email) {
        throw new Error("No sender email found on the original message");
      }

      const representative = viewedMessage.to?.[0];
      if (!representative?.email) {
        throw new Error("No recipient email found on the original message");
      }

      await jmapClient.sendEmail({
        from: representative.email,
        fromName: representative.name || representative.email,
        to: constituent.email,
        subject: templateSubject,
        text: templateBody,
      });
    },
    onSuccess: () => {
      toast.success("Reply sent successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send reply");
    },
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {viewedMessage.from[0]?.name && (
          <>
            <span className="font-medium text-muted-foreground">From:</span>
            <span>{viewedMessage.from[0].name.toLocaleString()}</span>
          </>
        )}
        <span className="font-medium text-muted-foreground">
          {viewedMessage.replyTo && viewedMessage.replyTo.length > 0
            ? "Reply-To:"
            : "From:"}
        </span>
        <span>
          {(viewedMessage.replyTo && viewedMessage.replyTo.length > 0
            ? viewedMessage.replyTo
            : viewedMessage.from
          )
            ?.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email))
            .join(", ") || "Unknown"}
        </span>
        <span className="font-medium text-muted-foreground">To:</span>
        <span>
          {viewedMessage.to?.map((a) => a.name || a.email).join(", ") ||
            "Unknown"}
        </span>
        {viewedMessage.receivedAt && (
          <>
            <span className="font-medium text-muted-foreground">Date:</span>
            <span>{new Date(viewedMessage.receivedAt).toLocaleString()}</span>
          </>
        )}
        {replySentAt && (
          <>
            <span className="font-medium text-muted-foreground">
              Replied on:
            </span>
            <span className="flex items-center gap-2">
              {new Date(replySentAt).toLocaleString()}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                disabled={sendAgainMutation.isPending}
                onClick={() => sendAgainMutation.mutate()}
              >
                {sendAgainMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Send again
              </Button>
            </span>
          </>
        )}
      </div>

      <hr />

      <div className="text-sm whitespace-pre-wrap break-words">
        {viewedMessage.body ||
          (typeof viewedMessage.textBody === "string"
            ? viewedMessage.textBody
            : Array.isArray(viewedMessage.textBody)
              ? viewedMessage.textBody
                .map((p) =>
                  typeof p === "string"
                    ? p
                    : (p as { partId: string }).partId,
                )
                .join("\n")
              : "(no text content)")}
      </div>
    </div>
  );
}

export function MessageViewDialog({
  messageId,
  open,
  onOpenChange,
  replySentAt,
  replyTemplateId,
  campaignId,
}: MessageViewDialogProps) {
  const { jmapClient, signInStalwart } = useAuth();
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
            {!jmapClient
              ? "Message content unavailable"
              : loading
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

        {!jmapClient ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-amber-700 font-medium">
              Only the representative account can view message content.
            </p>
            <p className="text-sm text-muted-foreground">
              <button
                type="button"
                className="underline hover:text-primary cursor-pointer"
                onClick={() => signInStalwart()}
              >
                Log in
              </button>{" "}
              with the representative account to access message details.
            </p>
          </div>
        ) : loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-red-600 py-4">{error}</p>
        ) : viewedMessage ? (
          <MessageContent
            viewedMessage={viewedMessage}
            replySentAt={replySentAt}
            replyTemplateId={replyTemplateId}
            campaignId={campaignId}
            jmapClient={jmapClient}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
