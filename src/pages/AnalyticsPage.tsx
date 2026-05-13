import { AnalyticsContainer } from "@/components/analytics/AnalyticsContainer";
import { PageLayout } from "@/components/PageLayout";

export const AnalyticsPage = () => {
  return (
    <PageLayout>
      <AnalyticsContainer timeBucket="week" />
    </PageLayout>
  );
};

export default AnalyticsPage;
