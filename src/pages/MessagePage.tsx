import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import type { JmapMessage } from "jmap-cli";

export function MessagePage() {
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();
  const { jmapClient, signInStalwart } = useAuth();
  const [viewedMessage, setViewedMessage] = useState<JmapMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!messageId || !jmapClient) return;

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
  }, [messageId, jmapClient]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <CardTitle className="text-lg">
              {loading
                ? "Loading message..."
                : error
                  ? "Failed to load message"
                  : viewedMessage?.subject || "Message"}
            </CardTitle>
            {!loading && !error && viewedMessage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0"
                onClick={handleBack}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!jmapClient ? (
              <div className="py-8 text-center space-y-4">
                <p className="text-amber-700 font-medium">
                  Only the representative account can view message content.
                </p>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => signInStalwart()}
                >
                  Login with representative account
                </Button>
              </div>
            ) : loading ? (
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
                  <span className="font-medium text-muted-foreground">
                    To:
                  </span>
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
            ) : !jmapClient ? null : (
              <p className="text-sm text-muted-foreground py-4">
                No message content available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
