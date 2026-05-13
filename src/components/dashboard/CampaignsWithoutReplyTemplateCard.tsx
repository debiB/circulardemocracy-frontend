import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-primary">
          Campaigns without a reply template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaigns.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6">
            Every campaign has a reply template set up.
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-10 gap-2">
                {pageItems.map((campaign) => (
                  <Link
                    key={campaign.campaignId}
                    to={`/campaigns/${campaign.campaignId}`}
                    title={campaign.name}
                    className="block truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-center text-sm font-medium text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    {campaign.name}
                  </Link>
                ))}
              </div>
            </div>
            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
