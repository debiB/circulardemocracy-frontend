import { Suspense } from "react";
import { AnalyticsContainer } from "@/components/analytics/AnalyticsContainer";
import { CampaignsWithoutReplyTemplateCard } from "@/components/dashboard/CampaignsWithoutReplyTemplateCard";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { useUser } from "@/hooks/useUser";

const DashboardSectionFallback = () => (
...
export const DashboardPageContent = () => {
  const { data: profile } = useProfile();
  const displayUserName = profile?.firstname || "Guest";

  return (
    <PageLayout>
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary text-center">
            Welcome to Circular Democracy!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg">Hello, {displayUserName}</p>
        </CardContent>
      </Card>
      <div className="space-y-6 mt-6">
        <Suspense fallback={<DashboardSectionFallback />}>
          <CampaignsWithoutReplyTemplateCard />
        </Suspense>
        <Suspense fallback={<DashboardSectionFallback />}>
          <AnalyticsContainer timeBucket="day" />
        </Suspense>
      </div>
    </PageLayout>
  );
};

export const DashboardPage = () => {
  const { data: currentUser } = useUser();
  if (!currentUser) return null;

  return (
    <Suspense fallback={<DashboardSectionFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
};

export default DashboardPage;
