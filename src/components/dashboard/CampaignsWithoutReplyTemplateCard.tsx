import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCampaignsWithoutReplyTemplate } from "@/hooks/useCampaignsWithoutReplyTemplate";

const PAGE_SIZE = 10;

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
    <div
      role="alert"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/40"
    >
      <div className="flex gap-3">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-amber-950 dark:text-amber-50">
              Constituents are waiting
            </h2>
            <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
              Set up a template reply to start engaging.
            </p>
          </div>

          <div className="rounded-md border border-amber-200 bg-white/60 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-10 gap-2">
              {pageItems.map((campaign) => (
                <Tooltip key={campaign.campaignId}>
                  <TooltipTrigger asChild>
                    <Link
                      to={`/campaigns/${campaign.campaignId}`}
                      className="block truncate rounded-md border border-amber-200 bg-amber-50/80 px-2 py-2 text-center text-sm font-medium text-amber-950 outline-offset-2 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-50 dark:hover:bg-amber-900/50"
                    >
                      {campaign.name}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-xs text-left"
                  >
                    <p className="font-medium">{campaign.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 pt-3 dark:border-amber-800/60">
              <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                Page {currentPage} of {totalPages} ({campaigns.length}{" "}
                campaigns)
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
