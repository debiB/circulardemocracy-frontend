import { Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CampaignMessagesPage } from "./pages/CampaignMessagesPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { UsersPage } from "./pages/UsersPage";

// A simple spinner component for fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

// Component for protected routes (requires authentication)
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PageLayout centerContent={true}>
        <LoadingSpinner />
      </PageLayout>
    ); // Or a loading spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Component for public routes (accessible to unauthenticated users)
const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PageLayout centerContent={true}>
        <LoadingSpinner />
      </PageLayout>
    ); // Or a loading spinner
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export function App() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <PageLayout centerContent={true}>
        <LoadingSpinner />
      </PageLayout>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route
            path="/campaigns/:id"
            element={
              <Suspense
                fallback={
                  <PageLayout centerContent={true}>
                    <LoadingSpinner />
                  </PageLayout>
                }
              >
                <CampaignMessagesPage />
              </Suspense>
            }
          />
          <Route
            path="/users"
            element={
              <Suspense
                fallback={
                  <PageLayout centerContent={true}>
                    <LoadingSpinner />
                  </PageLayout>
                }
              >
                <UsersPage />
              </Suspense>
            }
          />
          <Route
            path="/templates"
            element={
              <Suspense
                fallback={
                  <PageLayout centerContent={true}>
                    <LoadingSpinner />
                  </PageLayout>
                }
              >
                <TemplatesPage />
              </Suspense>
            }
          />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
export default App;
