import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCampaignsWithoutReplyTemplate } from "@/hooks/useCampaignsWithoutReplyTemplate";

const PAGE_SIZE = 10;

const warningCardClassName =
  "gap-4 border-amber-300 bg-amber-50 py-4 shadow-none ring-amber-300/60 dark:border-amber-700/60 dark:bg-amber-950/40 dark:ring-amber-700/40";

const warningTextClassName = "text-amber-950 dark:text-amber-50";
const warningMutedClassName = "text-amber-900/80 dark:text-amber-100/80";

export function CampaignsWithoutReplyTemplateCard() {
  const { data: campaigns } = useCampaignsWithoutReplyTemplate();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return campaigns.slice(start, start + PAGE_SIZE);
  }, [campaigns, currentPage]);

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <Card role="alert" className={warningCardClassName}>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 px-4 pb-0">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className={warningTextClassName}>
            Your constituents are waiting
          </CardTitle>
          <CardDescription className={warningMutedClassName}>
            Set up a template reply to start engaging.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
          {pageItems.map((campaign) => (
            <Tooltip key={campaign.campaignId}>
              <TooltipTrigger asChild>
                <Card
                  size="sm"
                  className="gap-0 border-amber-200 bg-white/60 py-0 shadow-none ring-amber-200/80 hover:bg-amber-100/80 data-[size=sm]:py-0 dark:border-amber-800/60 dark:bg-amber-950/20 dark:ring-amber-800/40 dark:hover:bg-amber-900/50"
                >
                  <CardContent className="p-0">
                    <Link
                      to={`/campaigns/${campaign.campaignId}`}
                      className="flex  items-center justify-between gap-1.5 px-2 py-1 text-sm font-medium text-amber-950 outline-offset-2 focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-50"
                    >
                      <span className="min-w-0 truncate">{campaign.name}</span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 border-amber-200/80 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-50"
                      >
                        {campaign.messageCount}
                      </Badge>
                    </Link>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-xs text-left"
              >
                <p className="font-medium">{campaign.name}</p>
                <p className="text-white text-xs">
                  {campaign.messageCount}{" "}
                  {campaign.messageCount === 1 ? "message" : "messages"}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>

      {totalPages > 1 ? (
        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 px-4 pt-4 dark:border-amber-800/60">
          <p className={`text-sm ${warningMutedClassName}`}>
            Page {currentPage} of {totalPages} ({campaigns.length} campaigns)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-amber-300 bg-white/80 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-900/50"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-amber-300 bg-white/80 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-900/50"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
