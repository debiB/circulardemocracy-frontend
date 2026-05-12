import { AnalyticsContainer } from "@/components/analytics/AnalyticsContainer";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser"; // Import useUser hook
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
      {/* Add more dashboard content here */}
      <AnalyticsContainer />
    </PageLayout>
  );
};

export default DashboardPage;
