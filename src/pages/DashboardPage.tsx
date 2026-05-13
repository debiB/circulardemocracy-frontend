import { Suspense } from "react";
import { AnalyticsContainer } from "@/components/analytics/AnalyticsContainer";
import { CampaignsWithoutReplyTemplateCard } from "@/components/dashboard/CampaignsWithoutReplyTemplateCard";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";

const DashboardSectionFallback = () => (
  <Card className="p-4">
    <CardContent className="flex items-center justify-center min-h-[220px] pt-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </CardContent>
  </Card>
);

export const DashboardPage = () => {
  const { data: currentUser } = useUser();
  if (!currentUser) return null;
  const displayUserName = currentUser?.email
    ? currentUser.email.split("@")[0]
    : "Guest";

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
          <AnalyticsContainer timeBucket="day" />
        </Suspense>
        <Suspense fallback={<DashboardSectionFallback />}>
          <CampaignsWithoutReplyTemplateCard />
        </Suspense>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;
